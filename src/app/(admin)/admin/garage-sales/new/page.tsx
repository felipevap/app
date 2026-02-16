"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewGarageSalePage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: "",
        startDate: "",
        endDate: "",
        address: "",
        leaderName: "",
        leaderEmail: "",
        rules: "",
    });

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Simulate saving
        console.log("Saving Garage Sale:", formData);
        alert("Garage Sale Created Successfully!");
        router.push("/admin");
    };

    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">New Garage Sale</h1>
                    <p className="text-neutral-400">Create a new event and assign a leader.</p>
                </div>
                <Link
                    href="/admin"
                    className="rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-700"
                >
                    Cancel
                </Link>
            </header>

            <form onSubmit={handleSubmit} className="space-y-8 rounded-2xl border border-neutral-800 bg-neutral-950 p-8 shadow-xl">
                {/* Basic Info */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-blue-400">Event Details</h2>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-neutral-300">
                                Garage Sale Name
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                placeholder="Summer Sale 2026"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-300">
                                Start Date
                            </label>
                            <input
                                type="date"
                                name="startDate"
                                value={formData.startDate}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-300">
                                End Date
                            </label>
                            <input
                                type="date"
                                name="endDate"
                                value={formData.endDate}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-neutral-300">
                                Address
                            </label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                placeholder="123 Main St, City, State"
                                required
                            />
                        </div>
                    </div>
                </div>

                <hr className="border-neutral-800" />

                {/* Leader Info */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-purple-400">Responsible Leader</h2>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-neutral-300">
                                Leader Name
                            </label>
                            <input
                                type="text"
                                name="leaderName"
                                value={formData.leaderName}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                placeholder="John Doe"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-300">
                                Leader Email
                            </label>
                            <input
                                type="email"
                                name="leaderEmail"
                                value={formData.leaderEmail}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                placeholder="john@example.com"
                                required
                            />
                        </div>
                    </div>
                </div>

                <hr className="border-neutral-800" />

                {/* Rules & Settings */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-green-400">Rules & Configuration</h2>
                    <div>
                        <label className="block text-sm font-medium text-neutral-300">
                            Rules & Terms
                        </label>
                        <textarea
                            name="rules"
                            value={formData.rules}
                            onChange={handleChange}
                            rows={4}
                            className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
                            placeholder="Enter specific rules for this garage sale..."
                        />
                    </div>

                    {/* Banner Placeholder */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-300">
                            Banner Image
                        </label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-neutral-800 border-dashed rounded-lg hover:border-neutral-600 cursor-pointer bg-neutral-900/50">
                            <div className="space-y-1 text-center">
                                <svg
                                    className="mx-auto h-12 w-12 text-neutral-400"
                                    stroke="currentColor"
                                    fill="none"
                                    viewBox="0 0 48 48"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                        strokeWidth={2}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                                <div className="flex text-sm text-neutral-400">
                                    <span className="relative rounded-md font-medium text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 hover:text-blue-400">
                                        Upload a file
                                    </span>
                                    <p className="pl-1">or drag and drop</p>
                                </div>
                                <p className="text-xs text-neutral-500">PNG, JPG, GIF up to 10MB</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-neutral-900"
                    >
                        Create Garage Sale
                    </button>
                </div>
            </form>
        </div>
    );
}
