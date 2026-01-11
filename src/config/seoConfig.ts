import { SeoProps } from '../components/seo/SeoHead';

const DOMAIN = "https://crosscast.art";

export type ModuleId = 'home' | 'shadow-caster' | 'audio-totem' | 'luminance' | 'resonance';

export const SEO_CONFIG: Record<ModuleId, SeoProps> = {
    home: {
        title: "CrossCast | Generative Design Suite",
        description: "The generative design suite for modern makers. Create shadow lamps, lithophanes, and sound sculptures.",
        slug: "/",
        image: `${DOMAIN}/og-hub.jpg`
    },
    resonance: {
        title: "Resonance Engine | Frequency Landscape Generator",
        description: "Turn audio frequencies into 3D terrains. A professional tool to visualize soundscapes and export topographic meshes.",
        keywords: "frequency landscape, audio terrain, sound elevation map, music visualizer 3d, resonance engine",
        slug: "/modules/resonance",
        image: `${DOMAIN}/og-resonance.jpg`
    },
    // Add others as needed: 'shadow-caster', 'audio-totem', 'luminance'
    "shadow-caster": { title: "Shadow Caster", slug: "/modules/shadow-caster" },
    "audio-totem": { title: "Audio Totem", slug: "/modules/audio-totem" },
    luminance: { title: "Luminance", slug: "/modules/luminance" }
};