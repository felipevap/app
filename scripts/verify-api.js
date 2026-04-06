const verifyApi = async () => {
    const baseUrl = 'http://localhost:3000';
    console.log(`Testing API at ${baseUrl}...`);

    try {
        // Test GET /garage-sales
        console.log('Testing GET /api/garage-sales...');
        const resGS = await fetch(`${baseUrl}/api/garage-sales`);
        if (!resGS.ok) throw new Error(`GET /api/garage-sales failed: ${resGS.status}`);
        const dataGS = await resGS.json();
        console.log(`GET /api/garage-sales success. Count: ${dataGS.length}`);

        // Test GET /products
        console.log('Testing GET /api/products...');
        const resProd = await fetch(`${baseUrl}/api/products`);
        if (!resProd.ok) throw new Error(`GET /api/products failed: ${resProd.status}`);
        const dataProd = await resProd.json();
        console.log(`GET /api/products success. Count: ${dataProd.length}`);

        // Test POST /garage-sales (with new fields)
        console.log('Testing POST /api/garage-sales...');
        const newGS = {
            nome: "Teste API",
            dataInicio: "2026-03-01",
            dataFim: "2026-03-02",
            endereco: "123 Test St",
            responsavel: "Tester",
            email: "test@example.com",
            regras: "Test rules",
            banner: ""
        };
        const resCreate = await fetch(`${baseUrl}/api/garage-sales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newGS)
        });

        if (!resCreate.ok) {
            const errText = await resCreate.text();
            throw new Error(`POST /api/garage-sales failed: ${resCreate.status} - ${errText}`);
        }

        const createdGS = await resCreate.json();
        console.log(`POST /api/garage-sales success. ID: ${createdGS.id}`);

        // Clean up (optional, but good practice)
        // Note: DELETE not implemented in API yet for GS? Or needs ID.
        // Assuming no delete endpoint for now or easy delete.

    } catch (error) {
        console.error('Verification Failed:', error);
        process.exit(1);
    }
};

verifyApi();
