"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useGarageSales } from "@/contexts/GarageSaleContext";
import Webcam from "react-webcam";
import Toast from "@/components/Toast";
import { loadModel, detectObjects, cropImage, DetectionResult } from "@/utils/objectDetection";
import { Suspense } from "react";

import { COCO_TO_CATEGORY_MAP } from "@/utils/imageMatching";
import { computeProductEmbeddingMean } from "@/utils/productEmbedding";

const CATEGORIES = ["Eletrônicos", "Roupas", "Móveis", "Livros", "Brinquedos", "Esportes", "Decoração", "CD", "DVD", "LP", "Itens cozinha", "Ferramentas", "Itens piscina", "Cama mesa e banho", "Eletrodomésticos", "Saúde", "Outros"];

const COCO_TRANSLATIONS: Record<string, string> = {
    'person': 'Pessoa',
    'bicycle': 'Bicicleta',
    'car': 'Carro',
    'motorcycle': 'Moto',
    'airplane': 'Avião',
    'bus': 'Ônibus',
    'train': 'Trem',
    'truck': 'Caminhão',
    'boat': 'Barco',
    'traffic light': 'Semáforo',
    'fire hydrant': 'Hidrante',
    'stop sign': 'Pare',
    'parking meter': 'Parquímetro',
    'bench': 'Banco',
    'bird': 'Pássaro',
    'cat': 'Gato',
    'dog': 'Cachorro',
    'horse': 'Cavalo',
    'sheep': 'Ovelha',
    'cow': 'Vaca',
    'elephant': 'Elefante',
    'bear': 'Urso',
    'zebra': 'Zebra',
    'giraffe': 'Girafa',
    'backpack': 'Mochila',
    'umbrella': 'Guarda-chuva',
    'handbag': 'Bolsa',
    'tie': 'Gravata',
    'suitcase': 'Mala',
    'frisbee': 'Frisbee',
    'skis': 'Esquis',
    'snowboard': 'Snowboard',
    'sports ball': 'Bola',
    'kite': 'Pipa',
    'baseball bat': 'Taco de Beisebol',
    'baseball glove': 'Luva de Beisebol',
    'skateboard': 'Skate',
    'surfboard': 'Prancha de Surf',
    'tennis racket': 'Raquete de Tênis',
    'bottle': 'Garrafa',
    'wine glass': 'Taça',
    'cup': 'Copo',
    'fork': 'Garfo',
    'knife': 'Faca',
    'spoon': 'Colher',
    'bowl': 'Tigela',
    'banana': 'Banana',
    'apple': 'Maçã',
    'sandwich': 'Sanduíche',
    'orange': 'Laranja',
    'broccoli': 'Brócolis',
    'carrot': 'Cenoura',
    'hot dog': 'Cachorro Quente',
    'pizza': 'Pizza',
    'donut': 'Rosquinha',
    'cake': 'Bolo',
    'chair': 'Cadeira',
    'couch': 'Sofá',
    'potted plant': 'Vaso de Planta',
    'bed': 'Cama',
    'dining table': 'Mesa de Jantar',
    'toilet': 'Privada',
    'tv': 'TV',
    'laptop': 'Notebook',
    'mouse': 'Mouse',
    'remote': 'Controle Remoto',
    'keyboard': 'Teclado',
    'cell phone': 'Celular',
    'microwave': 'Micro-ondas',
    'oven': 'Forno',
    'toaster': 'Torradeira',
    'sink': 'Pia',
    'refrigerator': 'Geladeira',
    'book': 'Livro',
    'clock': 'Relógio',
    'vase': 'Vaso',
    'scissors': 'Tesoura',
    'teddy bear': 'Urso de Pelúcia',
    'hair drier': 'Secador de Cabelo',
    'toothbrush': 'Escova de Dentes'
};

function NewProductContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { garageSales, addProduct, loading } = useGarageSales();
    const webcamRef = useRef<Webcam>(null);

    const [currentTag, setCurrentTag] = useState("");
    const [showCamera, setShowCamera] = useState(false);
    const [formData, setFormData] = useState({
        nome: "",
        descricao: "",
        preco: 0,
        imagens: [] as string[],
        categoria: "Outros",
        condicao: "Usado - Bom",
        tags: [] as string[],
        garageSaleId: "",
    });
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({ message: '', type: 'info', isVisible: false });

    // Object Detection & Cropping State
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [processingImage, setProcessingImage] = useState(false);
    const [showSelectionModal, setShowSelectionModal] = useState(false);
    const [currentImageForSelection, setCurrentImageForSelection] = useState<string | null>(null);
    const [detections, setDetections] = useState<DetectionResult[]>([]);
    const [selectedDetectionClass, setSelectedDetectionClass] = useState<string | null>(null);

    // Interactive Cropping
    const imageRef = useRef<HTMLImageElement>(null);
    const [cropBox, setCropBox] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
    const [interaction, setInteraction] = useState<{
        mode: 'none' | 'moving' | 'resizing',
        startPos: { x: number, y: number },
        startBox: { x: number, y: number, w: number, h: number },
        handle?: string
    }>({ mode: 'none', startPos: { x: 0, y: 0 }, startBox: { x: 0, y: 0, w: 0, h: 0 } });

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToast({ message, type, isVisible: true });
    };

    useEffect(() => {
        const garageSaleParam = searchParams?.get("garageSale");
        if (garageSaleParam) {
            setFormData(prev => ({ ...prev, garageSaleId: garageSaleParam }));
        } else if (garageSales.length > 0) {
            setFormData(prev => ({ ...prev, garageSaleId: garageSales[0].id }));
        }
    }, [searchParams, garageSales]);

    useEffect(() => {
        loadModel().then(loaded => setIsModelLoaded(loaded));
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-stone-900">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-stone-600 font-medium">Carregando dados...</p>
            </div>
        );
    }

    const processAddedImage = async (dataUrl: string) => {
        if (!isModelLoaded) {
            setFormData(prev => ({ ...prev, imagens: [...prev.imagens, dataUrl] }));
            return;
        }

        setProcessingImage(true);
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve) => { img.onload = resolve; });

        // Resize for stable detection (Max 640px)
        const MAX_DETECTION_SIZE = 640;
        let dWidth = img.width;
        let dHeight = img.height;
        let scale = 1;

        if (dWidth > MAX_DETECTION_SIZE || dHeight > MAX_DETECTION_SIZE) {
            if (dWidth > dHeight) {
                scale = MAX_DETECTION_SIZE / dWidth;
                dWidth = MAX_DETECTION_SIZE;
                dHeight = img.height * scale;
            } else {
                scale = MAX_DETECTION_SIZE / dHeight;
                dHeight = MAX_DETECTION_SIZE;
                dWidth = img.width * scale;
            }
        }

        const detectionCanvas = document.createElement('canvas');
        detectionCanvas.width = dWidth;
        detectionCanvas.height = dHeight;
        const ctx = detectionCanvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, dWidth, dHeight);
        }

        console.log(`Running detection on resized image: ${dWidth}x${dHeight} (Original: ${img.width}x${img.height})`);

        try {
            const rawResults = await detectObjects(detectionCanvas);
            console.log("Detection raw results:", rawResults);

            // Scale results back to original image size
            const results = rawResults.map(res => ({
                ...res,
                bbox: [
                    res.bbox[0] / scale,
                    res.bbox[1] / scale,
                    res.bbox[2] / scale,
                    res.bbox[3] / scale
                ] as [number, number, number, number]
            }));

            setDetections(results); // Always set detections, even if empty

            if (results.length > 0) {
                // Default to first detection
                const first = results[0];
                setCropBox({
                    x: first.bbox[0],
                    y: first.bbox[1],
                    w: first.bbox[2],
                    h: first.bbox[3]
                });
                setSelectedDetectionClass(first.class);
            } else {
                // FALLBACK: Manual selection if no object detected
                setSelectedDetectionClass(null); // No class detected

                // Default box: 80% with centered
                const defaultW = img.width * 0.8;
                const defaultH = img.height * 0.8;
                const defaultX = (img.width - defaultW) / 2;
                const defaultY = (img.height - defaultH) / 2;

                setCropBox({
                    x: defaultX,
                    y: defaultY,
                    w: defaultW,
                    h: defaultH
                });

                showToast("Nenhum objeto identificado automaticamente. Ajuste a seleção manualmente.", "info");
            }

            setCurrentImageForSelection(dataUrl); // Use dataUrl from function parameter
            setShowSelectionModal(true); // Use setShowSelectionModal
        } catch (error) {
            console.error("Detection error in processAddedImage:", error);
            showToast("Erro ao processar imagem.", "error");
            setFormData(prev => ({ ...prev, imagens: [...prev.imagens, dataUrl] }));
        } finally {
            setProcessingImage(false);
        }
    };

    // --- Interactive Cropping Logic ---

    const getScaledCoords = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        const img = imageRef.current;
        if (!img) return null;

        const rect = img.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const scaleX = img.naturalWidth / rect.width;
        const scaleY = img.naturalHeight / rect.height;

        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        return { x, y, scaleX, scaleY, rect };
    };

    const handlePointerDown = (e: React.MouseEvent | React.TouchEvent, action: 'move' | 'resize' | 'create', handle?: string) => {
        e.preventDefault();
        e.stopPropagation();

        const coords = getScaledCoords(e);
        if (!coords || (!cropBox && action !== 'create')) return;

        if (action === 'create') {
            // Logic to find detection or start new box handled in handleImageClick
            return;
        }

        setInteraction({
            mode: action === 'move' ? 'moving' : 'resizing',
            startPos: { x: coords.x, y: coords.y },
            startBox: cropBox!,
            handle
        });
    };

    const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (interaction.mode === 'none' || !cropBox) return;
        e.preventDefault();

        const coords = getScaledCoords(e);
        if (!coords) return;

        const dx = coords.x - interaction.startPos.x;
        const dy = coords.y - interaction.startPos.y;

        if (interaction.mode === 'moving') {
            setCropBox({
                ...cropBox,
                x: interaction.startBox.x + dx,
                y: interaction.startBox.y + dy
            });
        } else if (interaction.mode === 'resizing' && interaction.handle) {
            const box = { ...interaction.startBox };

            if (interaction.handle.includes('n')) { box.y += dy; box.h -= dy; }
            if (interaction.handle.includes('s')) { box.h += dy; }
            if (interaction.handle.includes('w')) { box.x += dx; box.w -= dx; }
            if (interaction.handle.includes('e')) { box.w += dx; }

            // Normalize negative width/height
            if (box.w < 0) { box.x += box.w; box.w = Math.abs(box.w); }
            if (box.h < 0) { box.y += box.h; box.h = Math.abs(box.h); }

            setCropBox(box);
        }
    };

    const handlePointerUp = () => {
        setInteraction({ mode: 'none', startPos: { x: 0, y: 0 }, startBox: { x: 0, y: 0, w: 0, h: 0 } });
    };

    const handleImageClick = (e: React.MouseEvent | React.TouchEvent) => {
        if (interaction.mode !== 'none') return;

        const coords = getScaledCoords(e);
        if (!coords) return;

        // 1. Check if clicked inside an existing detection
        const clickedDetection = detections.find(d =>
            coords.x >= d.bbox[0] && coords.x <= d.bbox[0] + d.bbox[2] &&
            coords.y >= d.bbox[1] && coords.y <= d.bbox[1] + d.bbox[3]
        );

        if (clickedDetection) {
            setCropBox({
                x: clickedDetection.bbox[0],
                y: clickedDetection.bbox[1],
                w: clickedDetection.bbox[2],
                h: clickedDetection.bbox[3]
            });
            setSelectedDetectionClass(clickedDetection.class);
        } else {
            // 2. Create a default box around the click
            const size = 200; // Default size in image pixels
            setCropBox({
                x: coords.x - size / 2,
                y: coords.y - size / 2,
                w: size,
                h: size
            });
            setSelectedDetectionClass(null); // Manual box has no class initially
        }
    };


    const generateDescription = (name: string, category: string, condition: string) => {
        if (!name) return "";

        const templates = [
            `Oportunidade incrível! ${name} em estado ${condition}. Perfeito para quem busca qualidade e economia na categoria ${category}.`,
            `${name} disponível! Item ${condition}, ideal para seu uso diário. Aproveite esta oferta de ${category}.`,
            `Confira este(a) ${name}! Produto ${condition} com ótimo custo-benefício. Destaque em nossa seção de ${category}.`,
            `Vendo ${name} (${condition}). Ótimo estado de conservação, pronto para uso. Veja mais itens de ${category} no nosso evento.`,
            `${category}: ${name} em condição ${condition}. Peça única, não perca!`
        ];

        return templates[Math.floor(Math.random() * templates.length)];
    };

    const handleSuggestDescription = () => {
        const desc = generateDescription(formData.nome, formData.categoria, formData.condicao);
        if (desc) {
            setFormData(prev => ({ ...prev, descricao: desc }));
            showToast("Descrição sugerida!", "success");
        } else {
            showToast("Preencha o nome do produto primeiro.", "info");
        }
    };

    const handleCropConfirm = () => {
        if (!currentImageForSelection || !cropBox) return;

        const img = new Image();
        img.src = currentImageForSelection;
        img.onload = () => {
            const croppedUrl = cropImage(img, [cropBox.x, cropBox.y, cropBox.w, cropBox.h], 0);
            if (croppedUrl) {
                setFormData(prev => {
                    const updates: any = { imagens: [...prev.imagens, croppedUrl] };

                    // Auto-fill logic
                    if (selectedDetectionClass) {
                        const translatedName = COCO_TRANSLATIONS[selectedDetectionClass] || selectedDetectionClass;
                        // Suggested category logic
                        const suggestedCats = COCO_TO_CATEGORY_MAP[selectedDetectionClass];
                        const suggestedCategory = suggestedCats ? suggestedCats[0] : "Outros";

                        if (!prev.nome) updates.nome = translatedName;
                        if (prev.categoria === "Outros") updates.categoria = suggestedCategory;

                        // Auto-generate description if empty
                        if (!prev.descricao) {
                            updates.descricao = generateDescription(
                                updates.nome || prev.nome || translatedName,
                                updates.categoria || prev.categoria || suggestedCategory,
                                prev.condicao
                            );
                        }
                    }

                    return { ...prev, ...updates };
                });
            }
            closeSelectionModal();
        };
    };

    // ... (rest of the file)


    const handleKeepOriginal = () => {
        if (currentImageForSelection) {
            setFormData(prev => ({ ...prev, imagens: [...prev.imagens, currentImageForSelection] }));
        }
        closeSelectionModal();
    };

    const closeSelectionModal = () => {
        setShowSelectionModal(false);
        setCurrentImageForSelection(null);
        setDetections([]);
        setCropBox(null);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_SIZE = 1920;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                        processAddedImage(dataUrl);
                    }
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const capturePhoto = () => {
        if (!webcamRef.current) return;
        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) return;

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const MAX_SIZE = 1920;

            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                processAddedImage(dataUrl);
                setShowCamera(false);
            }
        };
        img.src = imageSrc;
    };

    const removeImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            imagens: prev.imagens.filter((_, i) => i !== index)
        }));
    };

    const formatBRL = (value: number): string => {
        return value.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^\d]/g, '');
        const numValue = parseFloat(value) / 100;
        setFormData({ ...formData, preco: numValue });
    };

    const handleAddTag = (e?: React.KeyboardEvent<HTMLInputElement>) => {
        if (e && e.key !== 'Enter') return;
        e?.preventDefault();

        if (currentTag.trim() && !formData.tags.includes(currentTag.trim().toLowerCase())) {
            setFormData({
                ...formData,
                tags: [...formData.tags, currentTag.trim().toLowerCase()]
            });
            setCurrentTag('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setFormData({
            ...formData,
            tags: formData.tags.filter(tag => tag !== tagToRemove)
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.garageSaleId) {
            showToast('Por favor, selecione um evento.', 'error');
            return;
        }

        try {
            const embedding =
                formData.imagens.length === 0
                    ? null
                    : (await computeProductEmbeddingMean(formData.imagens)) ?? null;
            await addProduct({
                ...formData,
                embedding,
            });
            showToast('Produto cadastrado com sucesso!', 'success');
            setTimeout(() => {
                router.push(`/admin/products?garageSale=${formData.garageSaleId}`);
            }, 1000);
        } catch (error) {
            showToast('Erro ao cadastrar produto.', 'error');
        }
    };

    if (garageSales.length === 0) {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="rounded-xl border border-stone-200 bg-white shadow-sm p-12 text-center">
                    <span className="mb-4 block text-6xl">🏪</span>
                    <h3 className="mb-2 text-xl font-bold text-stone-900">
                        Nenhum evento cadastrado
                    </h3>
                    <p className="mb-6 text-stone-600">
                        Crie um evento primeiro para poder adicionar produtos
                    </p>
                    <Link
                        href="/admin/garage-sales/new"
                        className="inline-block rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:scale-[1.02]"
                    >
                        Criar evento
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">Novo Produto</h1>
                    <p className="text-stone-600 text-sm sm:text-base">Adicione um produto ao evento</p>
                </div>
                <Link
                    href={`/admin/products${formData.garageSaleId ? `?garageSale=${formData.garageSaleId}` : ''}`}
                    className="w-full sm:w-auto text-center rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                >
                    Cancelar
                </Link>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow-sm border border-stone-200 p-4 sm:p-8 rounded-2xl">
                <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                        Evento
                    </label>
                    <select
                        value={formData.garageSaleId}
                        onChange={e => setFormData({ ...formData, garageSaleId: e.target.value })}
                        className="w-full bg-white border border-stone-300 rounded-lg p-3 text-stone-900 focus:border-blue-500 outline-none text-base"
                        required
                    >
                        {garageSales.map((gs) => (
                            <option key={gs.id} value={gs.id}>
                                {gs.nome}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                        Imagens do Produto
                    </label>

                    <div className="flex flex-col sm:flex-row gap-2 mb-4">
                        <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-stone-300 rounded-xl p-6 hover:border-blue-500 transition-colors cursor-pointer">
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                            <div className="w-10 h-10 mb-2">
                                <svg className="w-full h-full text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                            <p className="text-center text-stone-600 text-sm">Upload</p>
                        </label>

                        <button
                            type="button"
                            onClick={() => setShowCamera(!showCamera)}
                            className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-stone-300 rounded-xl p-6 hover:border-blue-500 transition-colors"
                        >
                            <div className="w-10 h-10 mb-2">
                                <svg className="w-full h-full text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <p className="text-center text-stone-600 text-sm">
                                {showCamera ? 'Fechar Câmera' : 'Usar Câmera'}
                            </p>
                        </button>
                    </div>

                    {showCamera && (
                        <div className="mb-4 rounded-xl overflow-hidden border-2 border-blue-500 shadow-xl">
                            <div className="bg-stone-100 p-2">
                                <p className="text-center text-stone-800 text-sm font-semibold">📸 Posicione o produto e clique para capturar</p>
                            </div>
                            <Webcam
                                ref={webcamRef}
                                audio={false}
                                screenshotFormat="image/jpeg"
                                screenshotQuality={1}
                                videoConstraints={{
                                    facingMode: "environment",
                                    width: { ideal: 1920 },
                                    height: { ideal: 1080 }
                                }}
                                className="w-full h-96 object-cover"
                            />
                            <div className="bg-stone-100 p-6 flex justify-center gap-4">
                                <button
                                    type="button"
                                    onClick={capturePhoto}
                                    className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-lg font-bold text-white transition-colors text-lg shadow-lg"
                                >
                                    📸 Capturar Foto
                                </button>
                            </div>
                        </div>
                    )}

                    {formData.imagens.length > 0 && (
                        <div className="border border-stone-200 rounded-xl p-4 bg-stone-50">
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {formData.imagens.map((img, index) => (
                                    <div key={index} className="relative flex-shrink-0">
                                        <img src={img} alt={`Preview ${index + 1}`} className="h-32 w-32 object-cover rounded-lg" />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <p className="text-center text-stone-600 text-sm mt-2">
                                {formData.imagens.length} imagem(ns) adicionada(s)
                            </p>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">Nome do Produto</label>
                        <input
                            type="text"
                            required
                            value={formData.nome}
                            onChange={e => setFormData({ ...formData, nome: e.target.value })}
                            className="w-full bg-white border border-stone-300 rounded-lg p-3 text-stone-900 focus:border-blue-500 outline-none text-base"
                            placeholder="Ex: Notebook Dell Inspiron"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">Preço (R$)</label>
                        <input
                            type="text"
                            required
                            value={`R$ ${formatBRL(formData.preco)}`}
                            onChange={handlePriceChange}
                            placeholder="R$ 0,00"
                            className="w-full bg-white border border-stone-300 rounded-lg p-3 text-stone-900 focus:border-blue-500 outline-none text-base"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-stone-700">Descrição</label>
                            <button
                                type="button"
                                onClick={handleSuggestDescription}
                                className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                ✨ Sugerir Descrição
                            </button>
                        </div>
                        <textarea
                            required
                            rows={4}
                            value={formData.descricao}
                            onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                            className="w-full bg-white border border-stone-300 rounded-lg p-3 text-stone-900 focus:border-blue-500 outline-none resize-none text-base"
                            placeholder="Descreva o produto..."
                        />
                    </div>

                    <label className="block text-sm font-medium text-stone-700 mb-2">Categoria</label>
                    <div className="space-y-2">
                        <select
                            value={CATEGORIES.includes(formData.categoria) ? formData.categoria : "Outros"}
                            onChange={(e) => {
                                if (e.target.value === "custom") {
                                    setFormData({ ...formData, categoria: "" });
                                } else {
                                    setFormData({ ...formData, categoria: e.target.value });
                                }
                            }}
                            className="w-full bg-white border border-stone-300 rounded-lg p-3 text-stone-900 focus:border-blue-500 outline-none text-base"
                        >
                            {CATEGORIES.filter(c => c !== "Outros").map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                            <option value="Outros">Outros</option>
                            <option value="custom">✨ Nova Categoria...</option>
                        </select>

                        {(!CATEGORIES.includes(formData.categoria) && formData.categoria !== "Outros") || formData.categoria === "" ? (
                            <input
                                type="text"
                                value={formData.categoria}
                                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                                placeholder="Digite o nome da categoria"
                                className="w-full bg-white border border-stone-300 rounded-lg p-3 text-stone-900 focus:border-blue-500 outline-none text-base"
                                autoFocus
                            />
                        ) : null}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">Estado/Condição</label>
                        <select
                            value={formData.condicao}
                            onChange={e => setFormData({ ...formData, condicao: e.target.value })}
                            className="w-full bg-white border border-stone-300 rounded-lg p-3 text-stone-900 focus:border-blue-500 outline-none text-base"
                            required
                        >
                            <option value="Novo">Novo</option>
                            <option value="Semi-novo">Semi-novo</option>
                            <option value="Usado - Excelente">Usado - Excelente</option>
                            <option value="Usado - Bom">Usado - Bom</option>
                            <option value="Usado - Regular">Usado - Regular</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">Tags</label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                value={currentTag}
                                onChange={e => setCurrentTag(e.target.value)}
                                onKeyDown={handleAddTag}
                                placeholder="Digite e pressione Enter"
                                className="flex-1 bg-white border border-stone-300 rounded-lg p-3 text-stone-900 focus:border-blue-500 outline-none text-base"
                            />
                            <button
                                type="button"
                                onClick={() => handleAddTag()}
                                className="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors font-bold text-white"
                            >
                                +
                            </button>
                        </div>
                        {formData.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {formData.tags.map((tag, index) => (
                                    <span
                                        key={index}
                                        className="flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm"
                                    >
                                        #{tag}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveTag(tag)}
                                            className="hover:text-blue-200"
                                        >
                                            ✕
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl"
                >
                    💾 Salvar Produto
                </button>

            </form>

            {/* Selection Modal */}
            {showSelectionModal && currentImageForSelection && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
                    <div className="w-full max-w-4xl bg-white rounded-2xl overflow-hidden flex flex-col max-h-[90vh] border border-stone-200 shadow-xl">
                        <div className="p-4 border-b border-stone-200 flex justify-between items-center bg-stone-50">
                            <div className="flex justify-between items-center w-full">
                                <h3 className="text-xl font-bold text-stone-900">
                                    {selectedDetectionClass
                                        ? `Objeto Detectado: ${COCO_TRANSLATIONS[selectedDetectionClass] || selectedDetectionClass}`
                                        : "Ajuste o Recorte (Seleção Manual)"
                                    }
                                </h3>
                                <button onClick={closeSelectionModal} className="text-stone-500 hover:text-stone-800">✕</button>
                            </div>
                        </div>

                        <div
                            className="flex-1 overflow-hidden p-4 flex items-center justify-center bg-black/50 relative touch-none"
                            onMouseMove={handlePointerMove}
                            onTouchMove={handlePointerMove}
                            onMouseUp={handlePointerUp}
                            onTouchEnd={handlePointerUp}
                            onMouseLeave={handlePointerUp}
                        >
                            <div className="relative inline-block">
                                <img
                                    ref={imageRef}
                                    src={currentImageForSelection}
                                    alt="Selection"
                                    className="max-w-full max-h-[60vh] object-contain pointer-events-none select-none"
                                    draggable={false}
                                />
                                {/* Overlay for detections and crop box */}
                                <div
                                    className="absolute inset-0"
                                    onMouseDown={handleImageClick}
                                    onTouchStart={handleImageClick}
                                >
                                    {/* Detections Hints (Faint) */}
                                    {detections.map((det, idx) => {
                                        const imgEl = imageRef.current;
                                        if (!imgEl) return null;
                                        const scaleX = imgEl.clientWidth / imgEl.naturalWidth;
                                        const scaleY = imgEl.clientHeight / imgEl.naturalHeight;
                                        const [x, y, w, h] = det.bbox;

                                        return (
                                            <div
                                                key={idx}
                                                className="absolute border border-green-500/30 bg-green-500/10"
                                                style={{
                                                    left: `${x * scaleX}px`,
                                                    top: `${y * scaleY}px`,
                                                    width: `${w * scaleX}px`,
                                                    height: `${h * scaleY}px`,
                                                }}
                                            />
                                        );
                                    })}

                                    {/* Active Crop Box */}
                                    {cropBox && (() => {
                                        const imgEl = imageRef.current;
                                        if (!imgEl) return null;
                                        const scaleX = imgEl.clientWidth / imgEl.naturalWidth;
                                        const scaleY = imgEl.clientHeight / imgEl.naturalHeight;

                                        return (
                                            <div
                                                className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] cursor-move"
                                                style={{
                                                    left: `${cropBox.x * scaleX}px`,
                                                    top: `${cropBox.y * scaleY}px`,
                                                    width: `${cropBox.w * scaleX}px`,
                                                    height: `${cropBox.h * scaleY}px`,
                                                }}
                                                onMouseDown={(e) => handlePointerDown(e, 'move')}
                                                onTouchStart={(e) => handlePointerDown(e, 'move')}
                                            >
                                                {/* Resize Handles */}
                                                {['nw', 'ne', 'sw', 'se'].map(handle => (
                                                    <div
                                                        key={handle}
                                                        className={`absolute w-6 h-6 bg-white border border-stone-400 rounded-full
                                                            ${handle.includes('n') ? '-top-3' : '-bottom-3'}
                                                            ${handle.includes('w') ? '-left-3' : '-right-3'}
                                                            cursor-${handle}-resize
                                                        `}
                                                        onMouseDown={(e) => handlePointerDown(e, 'resize', handle)}
                                                        onTouchStart={(e) => handlePointerDown(e, 'resize', handle)}
                                                    />
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-stone-200 flex justify-between gap-3 bg-stone-50">
                            <div className="text-stone-600 text-sm flex items-center">
                                * Toque na imagem para selecionar ou criar uma área
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleKeepOriginal}
                                    className="px-4 py-2 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-800 transition-colors"
                                >
                                    Manter Original
                                </button>
                                {cropBox && (
                                    <button
                                        onClick={handleCropConfirm}
                                        className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold transition-colors shadow-lg"
                                    >
                                        ✂️ Salvar Recorte
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {
                toast.isVisible && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast({ ...toast, isVisible: false })}
                    />
                )
            }
        </div >
    );
}

export default function NewProductPage() {
    return (
        <Suspense fallback={<div className="text-stone-700 text-center p-8">Carregando...</div>}>
            <NewProductContent />
        </Suspense>
    );
}
