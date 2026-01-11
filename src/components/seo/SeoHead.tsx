import React from 'react';
import { Helmet } from 'react-helmet-async';

export interface SeoProps {
    title?: string;
    description?: string;
    keywords?: string;
    image?: string; 
    slug?: string;
    type?: 'website' | 'article';
}

const DOMAIN = "https://crosscast.art";
const DEFAULT_IMAGE = `${DOMAIN}/og-hub.jpg`; 

export const SeoHead = ({ 
    title = "CrossCast | Generative Design Suite", 
    description = "Stop printing trinkets. Start manufacturing meaning. The generative design suite to create high-value, personalized products.",
    keywords = "audio to 3d, stl generator, crosscast, generative design",
    image = DEFAULT_IMAGE,
    slug = "",
    type = 'website'
}: SeoProps) => {
    const url = `${DOMAIN}${slug}`;

    // --- GOOGLE STRUCTURED DATA (JSON-LD) ---
    // This tells Google: "I am a Web Application, not just a blog."
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": title,
        "url": url,
        "description": description,
        "applicationCategory": "DesignApplication",
        "operatingSystem": "Web Browser",
        "offers": {
            "@type": "Offer",
            "price": "0.00",
            "priceCurrency": "USD"
        }
    };

    return (
        <Helmet>
            {/* 1. Basic Metadata */}
            <title>{title}</title>
            <meta name="description" content={description} />
            <meta name="keywords" content={keywords} />
            <link rel="canonical" href={url} />

            {/* 2. Open Graph (Facebook/LinkedIn/WhatsApp) */}
            <meta property="og:url" content={url} />
            <meta property="og:type" content={type} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />

            {/* 3. Twitter Cards */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={image} />

            {/* 4. The Google Signal (JSON-LD) */}
            <script type="application/ld+json">
                {JSON.stringify(structuredData)}
            </script>
        </Helmet>
    );
};