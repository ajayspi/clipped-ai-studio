import { z } from 'zod';
/**
 * Media Asset - canonical provenance-bearing asset
 */
export declare const MediaAssetSchema: z.ZodObject<{
    id: z.ZodString;
    url: z.ZodString;
    source: z.ZodEnum<["generated", "stock", "uploaded", "reference"]>;
    provider: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
    prompt: z.ZodOptional<z.ZodString>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    duration: z.ZodOptional<z.ZodNumber>;
    mimeType: z.ZodOptional<z.ZodString>;
    license: z.ZodOptional<z.ZodString>;
    attribution: z.ZodOptional<z.ZodString>;
    generatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    url: string;
    id: string;
    source: "generated" | "stock" | "uploaded" | "reference";
    prompt?: string | undefined;
    duration?: number | undefined;
    provider?: string | undefined;
    model?: string | undefined;
    mimeType?: string | undefined;
    generatedAt?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
    license?: string | undefined;
    attribution?: string | undefined;
}, {
    url: string;
    id: string;
    source: "generated" | "stock" | "uploaded" | "reference";
    prompt?: string | undefined;
    duration?: number | undefined;
    provider?: string | undefined;
    model?: string | undefined;
    mimeType?: string | undefined;
    generatedAt?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
    license?: string | undefined;
    attribution?: string | undefined;
}>;
export type MediaAsset = z.infer<typeof MediaAssetSchema>;
/**
 * Video from stock providers
 */
export declare const VideoSchema: z.ZodObject<{
    id: z.ZodString;
    url: z.ZodString;
    title: z.ZodString;
    platform: z.ZodEnum<["pixabay", "pexels", "unsplash", "coverr", "mixkit", "videvo", "openverse"]>;
    thumbnail: z.ZodOptional<z.ZodString>;
    duration: z.ZodOptional<z.ZodNumber>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    mediaAsset: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        url: z.ZodString;
        source: z.ZodEnum<["generated", "stock", "uploaded", "reference"]>;
        provider: z.ZodOptional<z.ZodString>;
        model: z.ZodOptional<z.ZodString>;
        prompt: z.ZodOptional<z.ZodString>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        mimeType: z.ZodOptional<z.ZodString>;
        license: z.ZodOptional<z.ZodString>;
        attribution: z.ZodOptional<z.ZodString>;
        generatedAt: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        id: string;
        source: "generated" | "stock" | "uploaded" | "reference";
        prompt?: string | undefined;
        duration?: number | undefined;
        provider?: string | undefined;
        model?: string | undefined;
        mimeType?: string | undefined;
        generatedAt?: string | undefined;
        width?: number | undefined;
        height?: number | undefined;
        license?: string | undefined;
        attribution?: string | undefined;
    }, {
        url: string;
        id: string;
        source: "generated" | "stock" | "uploaded" | "reference";
        prompt?: string | undefined;
        duration?: number | undefined;
        provider?: string | undefined;
        model?: string | undefined;
        mimeType?: string | undefined;
        generatedAt?: string | undefined;
        width?: number | undefined;
        height?: number | undefined;
        license?: string | undefined;
        attribution?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    url: string;
    id: string;
    platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
    title: string;
    duration?: number | undefined;
    width?: number | undefined;
    height?: number | undefined;
    thumbnail?: string | undefined;
    mediaAsset?: {
        url: string;
        id: string;
        source: "generated" | "stock" | "uploaded" | "reference";
        prompt?: string | undefined;
        duration?: number | undefined;
        provider?: string | undefined;
        model?: string | undefined;
        mimeType?: string | undefined;
        generatedAt?: string | undefined;
        width?: number | undefined;
        height?: number | undefined;
        license?: string | undefined;
        attribution?: string | undefined;
    } | undefined;
}, {
    url: string;
    id: string;
    platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
    title: string;
    duration?: number | undefined;
    width?: number | undefined;
    height?: number | undefined;
    thumbnail?: string | undefined;
    mediaAsset?: {
        url: string;
        id: string;
        source: "generated" | "stock" | "uploaded" | "reference";
        prompt?: string | undefined;
        duration?: number | undefined;
        provider?: string | undefined;
        model?: string | undefined;
        mimeType?: string | undefined;
        generatedAt?: string | undefined;
        width?: number | undefined;
        height?: number | undefined;
        license?: string | undefined;
        attribution?: string | undefined;
    } | undefined;
}>;
export type Video = z.infer<typeof VideoSchema>;
/**
 * Scene with media
 */
export declare const SceneSchema: z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
    keywords: z.ZodArray<z.ZodString, "many">;
    description: z.ZodString;
    duration: z.ZodNumber;
    emotion: z.ZodOptional<z.ZodString>;
    cameraMotion: z.ZodOptional<z.ZodString>;
    visualPrompt: z.ZodOptional<z.ZodString>;
    imagePrompt: z.ZodOptional<z.ZodString>;
    selectedVideo: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        url: z.ZodString;
        title: z.ZodString;
        platform: z.ZodEnum<["pixabay", "pexels", "unsplash", "coverr", "mixkit", "videvo", "openverse"]>;
        thumbnail: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        mediaAsset: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            url: z.ZodString;
            source: z.ZodEnum<["generated", "stock", "uploaded", "reference"]>;
            provider: z.ZodOptional<z.ZodString>;
            model: z.ZodOptional<z.ZodString>;
            prompt: z.ZodOptional<z.ZodString>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
            duration: z.ZodOptional<z.ZodNumber>;
            mimeType: z.ZodOptional<z.ZodString>;
            license: z.ZodOptional<z.ZodString>;
            attribution: z.ZodOptional<z.ZodString>;
            generatedAt: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            url: string;
            id: string;
            source: "generated" | "stock" | "uploaded" | "reference";
            prompt?: string | undefined;
            duration?: number | undefined;
            provider?: string | undefined;
            model?: string | undefined;
            mimeType?: string | undefined;
            generatedAt?: string | undefined;
            width?: number | undefined;
            height?: number | undefined;
            license?: string | undefined;
            attribution?: string | undefined;
        }, {
            url: string;
            id: string;
            source: "generated" | "stock" | "uploaded" | "reference";
            prompt?: string | undefined;
            duration?: number | undefined;
            provider?: string | undefined;
            model?: string | undefined;
            mimeType?: string | undefined;
            generatedAt?: string | undefined;
            width?: number | undefined;
            height?: number | undefined;
            license?: string | undefined;
            attribution?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        id: string;
        platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
        title: string;
        duration?: number | undefined;
        width?: number | undefined;
        height?: number | undefined;
        thumbnail?: string | undefined;
        mediaAsset?: {
            url: string;
            id: string;
            source: "generated" | "stock" | "uploaded" | "reference";
            prompt?: string | undefined;
            duration?: number | undefined;
            provider?: string | undefined;
            model?: string | undefined;
            mimeType?: string | undefined;
            generatedAt?: string | undefined;
            width?: number | undefined;
            height?: number | undefined;
            license?: string | undefined;
            attribution?: string | undefined;
        } | undefined;
    }, {
        url: string;
        id: string;
        platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
        title: string;
        duration?: number | undefined;
        width?: number | undefined;
        height?: number | undefined;
        thumbnail?: string | undefined;
        mediaAsset?: {
            url: string;
            id: string;
            source: "generated" | "stock" | "uploaded" | "reference";
            prompt?: string | undefined;
            duration?: number | undefined;
            provider?: string | undefined;
            model?: string | undefined;
            mimeType?: string | undefined;
            generatedAt?: string | undefined;
            width?: number | undefined;
            height?: number | undefined;
            license?: string | undefined;
            attribution?: string | undefined;
        } | undefined;
    }>>;
    imageUrl: z.ZodOptional<z.ZodString>;
    videoUrl: z.ZodOptional<z.ZodString>;
    audioUrl: z.ZodOptional<z.ZodString>;
    mediaAsset: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        url: z.ZodString;
        source: z.ZodEnum<["generated", "stock", "uploaded", "reference"]>;
        provider: z.ZodOptional<z.ZodString>;
        model: z.ZodOptional<z.ZodString>;
        prompt: z.ZodOptional<z.ZodString>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        mimeType: z.ZodOptional<z.ZodString>;
        license: z.ZodOptional<z.ZodString>;
        attribution: z.ZodOptional<z.ZodString>;
        generatedAt: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        id: string;
        source: "generated" | "stock" | "uploaded" | "reference";
        prompt?: string | undefined;
        duration?: number | undefined;
        provider?: string | undefined;
        model?: string | undefined;
        mimeType?: string | undefined;
        generatedAt?: string | undefined;
        width?: number | undefined;
        height?: number | undefined;
        license?: string | undefined;
        attribution?: string | undefined;
    }, {
        url: string;
        id: string;
        source: "generated" | "stock" | "uploaded" | "reference";
        prompt?: string | undefined;
        duration?: number | undefined;
        provider?: string | undefined;
        model?: string | undefined;
        mimeType?: string | undefined;
        generatedAt?: string | undefined;
        width?: number | undefined;
        height?: number | undefined;
        license?: string | undefined;
        attribution?: string | undefined;
    }>>;
    wordTimestamps: z.ZodOptional<z.ZodArray<z.ZodObject<{
        word: z.ZodString;
        start: z.ZodNumber;
        end: z.ZodNumber;
        confidence: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        word: string;
        start: number;
        end: number;
        confidence?: number | undefined;
    }, {
        word: string;
        start: number;
        end: number;
        confidence?: number | undefined;
    }>, "many">>;
    exactDuration: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    text: string;
    duration: number;
    description: string;
    keywords: string[];
    wordTimestamps?: {
        word: string;
        start: number;
        end: number;
        confidence?: number | undefined;
    }[] | undefined;
    imageUrl?: string | undefined;
    videoUrl?: string | undefined;
    selectedVideo?: {
        url: string;
        id: string;
        platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
        title: string;
        duration?: number | undefined;
        width?: number | undefined;
        height?: number | undefined;
        thumbnail?: string | undefined;
        mediaAsset?: {
            url: string;
            id: string;
            source: "generated" | "stock" | "uploaded" | "reference";
            prompt?: string | undefined;
            duration?: number | undefined;
            provider?: string | undefined;
            model?: string | undefined;
            mimeType?: string | undefined;
            generatedAt?: string | undefined;
            width?: number | undefined;
            height?: number | undefined;
            license?: string | undefined;
            attribution?: string | undefined;
        } | undefined;
    } | undefined;
    exactDuration?: number | undefined;
    imagePrompt?: string | undefined;
    audioUrl?: string | undefined;
    mediaAsset?: {
        url: string;
        id: string;
        source: "generated" | "stock" | "uploaded" | "reference";
        prompt?: string | undefined;
        duration?: number | undefined;
        provider?: string | undefined;
        model?: string | undefined;
        mimeType?: string | undefined;
        generatedAt?: string | undefined;
        width?: number | undefined;
        height?: number | undefined;
        license?: string | undefined;
        attribution?: string | undefined;
    } | undefined;
    emotion?: string | undefined;
    cameraMotion?: string | undefined;
    visualPrompt?: string | undefined;
}, {
    id: string;
    text: string;
    duration: number;
    description: string;
    keywords: string[];
    wordTimestamps?: {
        word: string;
        start: number;
        end: number;
        confidence?: number | undefined;
    }[] | undefined;
    imageUrl?: string | undefined;
    videoUrl?: string | undefined;
    selectedVideo?: {
        url: string;
        id: string;
        platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
        title: string;
        duration?: number | undefined;
        width?: number | undefined;
        height?: number | undefined;
        thumbnail?: string | undefined;
        mediaAsset?: {
            url: string;
            id: string;
            source: "generated" | "stock" | "uploaded" | "reference";
            prompt?: string | undefined;
            duration?: number | undefined;
            provider?: string | undefined;
            model?: string | undefined;
            mimeType?: string | undefined;
            generatedAt?: string | undefined;
            width?: number | undefined;
            height?: number | undefined;
            license?: string | undefined;
            attribution?: string | undefined;
        } | undefined;
    } | undefined;
    exactDuration?: number | undefined;
    imagePrompt?: string | undefined;
    audioUrl?: string | undefined;
    mediaAsset?: {
        url: string;
        id: string;
        source: "generated" | "stock" | "uploaded" | "reference";
        prompt?: string | undefined;
        duration?: number | undefined;
        provider?: string | undefined;
        model?: string | undefined;
        mimeType?: string | undefined;
        generatedAt?: string | undefined;
        width?: number | undefined;
        height?: number | undefined;
        license?: string | undefined;
        attribution?: string | undefined;
    } | undefined;
    emotion?: string | undefined;
    cameraMotion?: string | undefined;
    visualPrompt?: string | undefined;
}>;
export type Scene = z.infer<typeof SceneSchema>;
/**
 * Video match from stock search
 */
export declare const VideoMatchSchema: z.ZodObject<{
    video: z.ZodObject<{
        id: z.ZodString;
        url: z.ZodString;
        title: z.ZodString;
        platform: z.ZodEnum<["pixabay", "pexels", "unsplash", "coverr", "mixkit", "videvo", "openverse"]>;
        thumbnail: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        mediaAsset: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            url: z.ZodString;
            source: z.ZodEnum<["generated", "stock", "uploaded", "reference"]>;
            provider: z.ZodOptional<z.ZodString>;
            model: z.ZodOptional<z.ZodString>;
            prompt: z.ZodOptional<z.ZodString>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
            duration: z.ZodOptional<z.ZodNumber>;
            mimeType: z.ZodOptional<z.ZodString>;
            license: z.ZodOptional<z.ZodString>;
            attribution: z.ZodOptional<z.ZodString>;
            generatedAt: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            url: string;
            id: string;
            source: "generated" | "stock" | "uploaded" | "reference";
            prompt?: string | undefined;
            duration?: number | undefined;
            provider?: string | undefined;
            model?: string | undefined;
            mimeType?: string | undefined;
            generatedAt?: string | undefined;
            width?: number | undefined;
            height?: number | undefined;
            license?: string | undefined;
            attribution?: string | undefined;
        }, {
            url: string;
            id: string;
            source: "generated" | "stock" | "uploaded" | "reference";
            prompt?: string | undefined;
            duration?: number | undefined;
            provider?: string | undefined;
            model?: string | undefined;
            mimeType?: string | undefined;
            generatedAt?: string | undefined;
            width?: number | undefined;
            height?: number | undefined;
            license?: string | undefined;
            attribution?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        id: string;
        platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
        title: string;
        duration?: number | undefined;
        width?: number | undefined;
        height?: number | undefined;
        thumbnail?: string | undefined;
        mediaAsset?: {
            url: string;
            id: string;
            source: "generated" | "stock" | "uploaded" | "reference";
            prompt?: string | undefined;
            duration?: number | undefined;
            provider?: string | undefined;
            model?: string | undefined;
            mimeType?: string | undefined;
            generatedAt?: string | undefined;
            width?: number | undefined;
            height?: number | undefined;
            license?: string | undefined;
            attribution?: string | undefined;
        } | undefined;
    }, {
        url: string;
        id: string;
        platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
        title: string;
        duration?: number | undefined;
        width?: number | undefined;
        height?: number | undefined;
        thumbnail?: string | undefined;
        mediaAsset?: {
            url: string;
            id: string;
            source: "generated" | "stock" | "uploaded" | "reference";
            prompt?: string | undefined;
            duration?: number | undefined;
            provider?: string | undefined;
            model?: string | undefined;
            mimeType?: string | undefined;
            generatedAt?: string | undefined;
            width?: number | undefined;
            height?: number | undefined;
            license?: string | undefined;
            attribution?: string | undefined;
        } | undefined;
    }>;
    score: z.ZodNumber;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    video: {
        url: string;
        id: string;
        platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
        title: string;
        duration?: number | undefined;
        width?: number | undefined;
        height?: number | undefined;
        thumbnail?: string | undefined;
        mediaAsset?: {
            url: string;
            id: string;
            source: "generated" | "stock" | "uploaded" | "reference";
            prompt?: string | undefined;
            duration?: number | undefined;
            provider?: string | undefined;
            model?: string | undefined;
            mimeType?: string | undefined;
            generatedAt?: string | undefined;
            width?: number | undefined;
            height?: number | undefined;
            license?: string | undefined;
            attribution?: string | undefined;
        } | undefined;
    };
    score: number;
    reason: string;
}, {
    video: {
        url: string;
        id: string;
        platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
        title: string;
        duration?: number | undefined;
        width?: number | undefined;
        height?: number | undefined;
        thumbnail?: string | undefined;
        mediaAsset?: {
            url: string;
            id: string;
            source: "generated" | "stock" | "uploaded" | "reference";
            prompt?: string | undefined;
            duration?: number | undefined;
            provider?: string | undefined;
            model?: string | undefined;
            mimeType?: string | undefined;
            generatedAt?: string | undefined;
            width?: number | undefined;
            height?: number | undefined;
            license?: string | undefined;
            attribution?: string | undefined;
        } | undefined;
    };
    score: number;
    reason: string;
}>;
export type VideoMatch = z.infer<typeof VideoMatchSchema>;
/**
 * Script analysis result
 */
export declare const ScriptAnalysisSchema: z.ZodObject<{
    script: z.ZodString;
    scenes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        text: z.ZodString;
        keywords: z.ZodArray<z.ZodString, "many">;
        description: z.ZodString;
        duration: z.ZodNumber;
        emotion: z.ZodOptional<z.ZodString>;
        cameraMotion: z.ZodOptional<z.ZodString>;
        visualPrompt: z.ZodOptional<z.ZodString>;
        imagePrompt: z.ZodOptional<z.ZodString>;
        selectedVideo: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            url: z.ZodString;
            title: z.ZodString;
            platform: z.ZodEnum<["pixabay", "pexels", "unsplash", "coverr", "mixkit", "videvo", "openverse"]>;
            thumbnail: z.ZodOptional<z.ZodString>;
            duration: z.ZodOptional<z.ZodNumber>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
            mediaAsset: z.ZodOptional<z.ZodObject<{
                id: z.ZodString;
                url: z.ZodString;
                source: z.ZodEnum<["generated", "stock", "uploaded", "reference"]>;
                provider: z.ZodOptional<z.ZodString>;
                model: z.ZodOptional<z.ZodString>;
                prompt: z.ZodOptional<z.ZodString>;
                width: z.ZodOptional<z.ZodNumber>;
                height: z.ZodOptional<z.ZodNumber>;
                duration: z.ZodOptional<z.ZodNumber>;
                mimeType: z.ZodOptional<z.ZodString>;
                license: z.ZodOptional<z.ZodString>;
                attribution: z.ZodOptional<z.ZodString>;
                generatedAt: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                url: string;
                id: string;
                source: "generated" | "stock" | "uploaded" | "reference";
                prompt?: string | undefined;
                duration?: number | undefined;
                provider?: string | undefined;
                model?: string | undefined;
                mimeType?: string | undefined;
                generatedAt?: string | undefined;
                width?: number | undefined;
                height?: number | undefined;
                license?: string | undefined;
                attribution?: string | undefined;
            }, {
                url: string;
                id: string;
                source: "generated" | "stock" | "uploaded" | "reference";
                prompt?: string | undefined;
                duration?: number | undefined;
                provider?: string | undefined;
                model?: string | undefined;
                mimeType?: string | undefined;
                generatedAt?: string | undefined;
                width?: number | undefined;
                height?: number | undefined;
                license?: string | undefined;
                attribution?: string | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            url: string;
            id: string;
            platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
            mediaAsset?: {
                url: string;
                id: string;
                source: "generated" | "stock" | "uploaded" | "reference";
                prompt?: string | undefined;
                duration?: number | undefined;
                provider?: string | undefined;
                model?: string | undefined;
                mimeType?: string | undefined;
                generatedAt?: string | undefined;
                width?: number | undefined;
                height?: number | undefined;
                license?: string | undefined;
                attribution?: string | undefined;
            } | undefined;
        }, {
            url: string;
            id: string;
            platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
            mediaAsset?: {
                url: string;
                id: string;
                source: "generated" | "stock" | "uploaded" | "reference";
                prompt?: string | undefined;
                duration?: number | undefined;
                provider?: string | undefined;
                model?: string | undefined;
                mimeType?: string | undefined;
                generatedAt?: string | undefined;
                width?: number | undefined;
                height?: number | undefined;
                license?: string | undefined;
                attribution?: string | undefined;
            } | undefined;
        }>>;
        imageUrl: z.ZodOptional<z.ZodString>;
        videoUrl: z.ZodOptional<z.ZodString>;
        audioUrl: z.ZodOptional<z.ZodString>;
        mediaAsset: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            url: z.ZodString;
            source: z.ZodEnum<["generated", "stock", "uploaded", "reference"]>;
            provider: z.ZodOptional<z.ZodString>;
            model: z.ZodOptional<z.ZodString>;
            prompt: z.ZodOptional<z.ZodString>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
            duration: z.ZodOptional<z.ZodNumber>;
            mimeType: z.ZodOptional<z.ZodString>;
            license: z.ZodOptional<z.ZodString>;
            attribution: z.ZodOptional<z.ZodString>;
            generatedAt: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            url: string;
            id: string;
            source: "generated" | "stock" | "uploaded" | "reference";
            prompt?: string | undefined;
            duration?: number | undefined;
            provider?: string | undefined;
            model?: string | undefined;
            mimeType?: string | undefined;
            generatedAt?: string | undefined;
            width?: number | undefined;
            height?: number | undefined;
            license?: string | undefined;
            attribution?: string | undefined;
        }, {
            url: string;
            id: string;
            source: "generated" | "stock" | "uploaded" | "reference";
            prompt?: string | undefined;
            duration?: number | undefined;
            provider?: string | undefined;
            model?: string | undefined;
            mimeType?: string | undefined;
            generatedAt?: string | undefined;
            width?: number | undefined;
            height?: number | undefined;
            license?: string | undefined;
            attribution?: string | undefined;
        }>>;
        wordTimestamps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            word: z.ZodString;
            start: z.ZodNumber;
            end: z.ZodNumber;
            confidence: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            word: string;
            start: number;
            end: number;
            confidence?: number | undefined;
        }, {
            word: string;
            start: number;
            end: number;
            confidence?: number | undefined;
        }>, "many">>;
        exactDuration: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        text: string;
        duration: number;
        description: string;
        keywords: string[];
        wordTimestamps?: {
            word: string;
            start: number;
            end: number;
            confidence?: number | undefined;
        }[] | undefined;
        imageUrl?: string | undefined;
        videoUrl?: string | undefined;
        selectedVideo?: {
            url: string;
            id: string;
            platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
            mediaAsset?: {
                url: string;
                id: string;
                source: "generated" | "stock" | "uploaded" | "reference";
                prompt?: string | undefined;
                duration?: number | undefined;
                provider?: string | undefined;
                model?: string | undefined;
                mimeType?: string | undefined;
                generatedAt?: string | undefined;
                width?: number | undefined;
                height?: number | undefined;
                license?: string | undefined;
                attribution?: string | undefined;
            } | undefined;
        } | undefined;
        exactDuration?: number | undefined;
        imagePrompt?: string | undefined;
        audioUrl?: string | undefined;
        mediaAsset?: {
            url: string;
            id: string;
            source: "generated" | "stock" | "uploaded" | "reference";
            prompt?: string | undefined;
            duration?: number | undefined;
            provider?: string | undefined;
            model?: string | undefined;
            mimeType?: string | undefined;
            generatedAt?: string | undefined;
            width?: number | undefined;
            height?: number | undefined;
            license?: string | undefined;
            attribution?: string | undefined;
        } | undefined;
        emotion?: string | undefined;
        cameraMotion?: string | undefined;
        visualPrompt?: string | undefined;
    }, {
        id: string;
        text: string;
        duration: number;
        description: string;
        keywords: string[];
        wordTimestamps?: {
            word: string;
            start: number;
            end: number;
            confidence?: number | undefined;
        }[] | undefined;
        imageUrl?: string | undefined;
        videoUrl?: string | undefined;
        selectedVideo?: {
            url: string;
            id: string;
            platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
            mediaAsset?: {
                url: string;
                id: string;
                source: "generated" | "stock" | "uploaded" | "reference";
                prompt?: string | undefined;
                duration?: number | undefined;
                provider?: string | undefined;
                model?: string | undefined;
                mimeType?: string | undefined;
                generatedAt?: string | undefined;
                width?: number | undefined;
                height?: number | undefined;
                license?: string | undefined;
                attribution?: string | undefined;
            } | undefined;
        } | undefined;
        exactDuration?: number | undefined;
        imagePrompt?: string | undefined;
        audioUrl?: string | undefined;
        mediaAsset?: {
            url: string;
            id: string;
            source: "generated" | "stock" | "uploaded" | "reference";
            prompt?: string | undefined;
            duration?: number | undefined;
            provider?: string | undefined;
            model?: string | undefined;
            mimeType?: string | undefined;
            generatedAt?: string | undefined;
            width?: number | undefined;
            height?: number | undefined;
            license?: string | undefined;
            attribution?: string | undefined;
        } | undefined;
        emotion?: string | undefined;
        cameraMotion?: string | undefined;
        visualPrompt?: string | undefined;
    }>, "many">;
    totalDuration: z.ZodNumber;
    title: z.ZodOptional<z.ZodString>;
    summary: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    script: string;
    scenes: {
        id: string;
        text: string;
        duration: number;
        description: string;
        keywords: string[];
        wordTimestamps?: {
            word: string;
            start: number;
            end: number;
            confidence?: number | undefined;
        }[] | undefined;
        imageUrl?: string | undefined;
        videoUrl?: string | undefined;
        selectedVideo?: {
            url: string;
            id: string;
            platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
            mediaAsset?: {
                url: string;
                id: string;
                source: "generated" | "stock" | "uploaded" | "reference";
                prompt?: string | undefined;
                duration?: number | undefined;
                provider?: string | undefined;
                model?: string | undefined;
                mimeType?: string | undefined;
                generatedAt?: string | undefined;
                width?: number | undefined;
                height?: number | undefined;
                license?: string | undefined;
                attribution?: string | undefined;
            } | undefined;
        } | undefined;
        exactDuration?: number | undefined;
        imagePrompt?: string | undefined;
        audioUrl?: string | undefined;
        mediaAsset?: {
            url: string;
            id: string;
            source: "generated" | "stock" | "uploaded" | "reference";
            prompt?: string | undefined;
            duration?: number | undefined;
            provider?: string | undefined;
            model?: string | undefined;
            mimeType?: string | undefined;
            generatedAt?: string | undefined;
            width?: number | undefined;
            height?: number | undefined;
            license?: string | undefined;
            attribution?: string | undefined;
        } | undefined;
        emotion?: string | undefined;
        cameraMotion?: string | undefined;
        visualPrompt?: string | undefined;
    }[];
    totalDuration: number;
    title?: string | undefined;
    summary?: string | undefined;
}, {
    script: string;
    scenes: {
        id: string;
        text: string;
        duration: number;
        description: string;
        keywords: string[];
        wordTimestamps?: {
            word: string;
            start: number;
            end: number;
            confidence?: number | undefined;
        }[] | undefined;
        imageUrl?: string | undefined;
        videoUrl?: string | undefined;
        selectedVideo?: {
            url: string;
            id: string;
            platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
            mediaAsset?: {
                url: string;
                id: string;
                source: "generated" | "stock" | "uploaded" | "reference";
                prompt?: string | undefined;
                duration?: number | undefined;
                provider?: string | undefined;
                model?: string | undefined;
                mimeType?: string | undefined;
                generatedAt?: string | undefined;
                width?: number | undefined;
                height?: number | undefined;
                license?: string | undefined;
                attribution?: string | undefined;
            } | undefined;
        } | undefined;
        exactDuration?: number | undefined;
        imagePrompt?: string | undefined;
        audioUrl?: string | undefined;
        mediaAsset?: {
            url: string;
            id: string;
            source: "generated" | "stock" | "uploaded" | "reference";
            prompt?: string | undefined;
            duration?: number | undefined;
            provider?: string | undefined;
            model?: string | undefined;
            mimeType?: string | undefined;
            generatedAt?: string | undefined;
            width?: number | undefined;
            height?: number | undefined;
            license?: string | undefined;
            attribution?: string | undefined;
        } | undefined;
        emotion?: string | undefined;
        cameraMotion?: string | undefined;
        visualPrompt?: string | undefined;
    }[];
    totalDuration: number;
    title?: string | undefined;
    summary?: string | undefined;
}>;
export type ScriptAnalysis = z.infer<typeof ScriptAnalysisSchema>;
/**
 * Generation request for AI video
 */
export declare const GenerationRequestSchema: z.ZodObject<{
    script: z.ZodString;
    character: z.ZodOptional<z.ZodString>;
    platforms: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    style: z.ZodOptional<z.ZodEnum<["professional", "casual", "educational", "cinematic"]>>;
}, "strip", z.ZodTypeAny, {
    script: string;
    character?: string | undefined;
    platforms?: string[] | undefined;
    style?: "cinematic" | "professional" | "casual" | "educational" | undefined;
}, {
    script: string;
    character?: string | undefined;
    platforms?: string[] | undefined;
    style?: "cinematic" | "professional" | "casual" | "educational" | undefined;
}>;
export type GenerationRequest = z.infer<typeof GenerationRequestSchema>;
/**
 * Generation response
 */
export declare const GenerationResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    jobId: z.ZodString;
    status: z.ZodEnum<["pending", "generating", "rendering", "completed", "failed"]>;
    analysis: z.ZodObject<{
        script: z.ZodString;
        scenes: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            text: z.ZodString;
            keywords: z.ZodArray<z.ZodString, "many">;
            description: z.ZodString;
            duration: z.ZodNumber;
            emotion: z.ZodOptional<z.ZodString>;
            cameraMotion: z.ZodOptional<z.ZodString>;
            visualPrompt: z.ZodOptional<z.ZodString>;
            imagePrompt: z.ZodOptional<z.ZodString>;
            selectedVideo: z.ZodOptional<z.ZodObject<{
                id: z.ZodString;
                url: z.ZodString;
                title: z.ZodString;
                platform: z.ZodEnum<["pixabay", "pexels", "unsplash", "coverr", "mixkit", "videvo", "openverse"]>;
                thumbnail: z.ZodOptional<z.ZodString>;
                duration: z.ZodOptional<z.ZodNumber>;
                width: z.ZodOptional<z.ZodNumber>;
                height: z.ZodOptional<z.ZodNumber>;
                mediaAsset: z.ZodOptional<z.ZodObject<{
                    id: z.ZodString;
                    url: z.ZodString;
                    source: z.ZodEnum<["generated", "stock", "uploaded", "reference"]>;
                    provider: z.ZodOptional<z.ZodString>;
                    model: z.ZodOptional<z.ZodString>;
                    prompt: z.ZodOptional<z.ZodString>;
                    width: z.ZodOptional<z.ZodNumber>;
                    height: z.ZodOptional<z.ZodNumber>;
                    duration: z.ZodOptional<z.ZodNumber>;
                    mimeType: z.ZodOptional<z.ZodString>;
                    license: z.ZodOptional<z.ZodString>;
                    attribution: z.ZodOptional<z.ZodString>;
                    generatedAt: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    url: string;
                    id: string;
                    source: "generated" | "stock" | "uploaded" | "reference";
                    prompt?: string | undefined;
                    duration?: number | undefined;
                    provider?: string | undefined;
                    model?: string | undefined;
                    mimeType?: string | undefined;
                    generatedAt?: string | undefined;
                    width?: number | undefined;
                    height?: number | undefined;
                    license?: string | undefined;
                    attribution?: string | undefined;
                }, {
                    url: string;
                    id: string;
                    source: "generated" | "stock" | "uploaded" | "reference";
                    prompt?: string | undefined;
                    duration?: number | undefined;
                    provider?: string | undefined;
                    model?: string | undefined;
                    mimeType?: string | undefined;
                    generatedAt?: string | undefined;
                    width?: number | undefined;
                    height?: number | undefined;
                    license?: string | undefined;
                    attribution?: string | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                url: string;
                id: string;
                platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
                title: string;
                duration?: number | undefined;
                width?: number | undefined;
                height?: number | undefined;
                thumbnail?: string | undefined;
                mediaAsset?: {
                    url: string;
                    id: string;
                    source: "generated" | "stock" | "uploaded" | "reference";
                    prompt?: string | undefined;
                    duration?: number | undefined;
                    provider?: string | undefined;
                    model?: string | undefined;
                    mimeType?: string | undefined;
                    generatedAt?: string | undefined;
                    width?: number | undefined;
                    height?: number | undefined;
                    license?: string | undefined;
                    attribution?: string | undefined;
                } | undefined;
            }, {
                url: string;
                id: string;
                platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
                title: string;
                duration?: number | undefined;
                width?: number | undefined;
                height?: number | undefined;
                thumbnail?: string | undefined;
                mediaAsset?: {
                    url: string;
                    id: string;
                    source: "generated" | "stock" | "uploaded" | "reference";
                    prompt?: string | undefined;
                    duration?: number | undefined;
                    provider?: string | undefined;
                    model?: string | undefined;
                    mimeType?: string | undefined;
                    generatedAt?: string | undefined;
                    width?: number | undefined;
                    height?: number | undefined;
                    license?: string | undefined;
                    attribution?: string | undefined;
                } | undefined;
            }>>;
            imageUrl: z.ZodOptional<z.ZodString>;
            videoUrl: z.ZodOptional<z.ZodString>;
            audioUrl: z.ZodOptional<z.ZodString>;
            mediaAsset: z.ZodOptional<z.ZodObject<{
                id: z.ZodString;
                url: z.ZodString;
                source: z.ZodEnum<["generated", "stock", "uploaded", "reference"]>;
                provider: z.ZodOptional<z.ZodString>;
                model: z.ZodOptional<z.ZodString>;
                prompt: z.ZodOptional<z.ZodString>;
                width: z.ZodOptional<z.ZodNumber>;
                height: z.ZodOptional<z.ZodNumber>;
                duration: z.ZodOptional<z.ZodNumber>;
                mimeType: z.ZodOptional<z.ZodString>;
                license: z.ZodOptional<z.ZodString>;
                attribution: z.ZodOptional<z.ZodString>;
                generatedAt: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                url: string;
                id: string;
                source: "generated" | "stock" | "uploaded" | "reference";
                prompt?: string | undefined;
                duration?: number | undefined;
                provider?: string | undefined;
                model?: string | undefined;
                mimeType?: string | undefined;
                generatedAt?: string | undefined;
                width?: number | undefined;
                height?: number | undefined;
                license?: string | undefined;
                attribution?: string | undefined;
            }, {
                url: string;
                id: string;
                source: "generated" | "stock" | "uploaded" | "reference";
                prompt?: string | undefined;
                duration?: number | undefined;
                provider?: string | undefined;
                model?: string | undefined;
                mimeType?: string | undefined;
                generatedAt?: string | undefined;
                width?: number | undefined;
                height?: number | undefined;
                license?: string | undefined;
                attribution?: string | undefined;
            }>>;
            wordTimestamps: z.ZodOptional<z.ZodArray<z.ZodObject<{
                word: z.ZodString;
                start: z.ZodNumber;
                end: z.ZodNumber;
                confidence: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                word: string;
                start: number;
                end: number;
                confidence?: number | undefined;
            }, {
                word: string;
                start: number;
                end: number;
                confidence?: number | undefined;
            }>, "many">>;
            exactDuration: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            text: string;
            duration: number;
            description: string;
            keywords: string[];
            wordTimestamps?: {
                word: string;
                start: number;
                end: number;
                confidence?: number | undefined;
            }[] | undefined;
            imageUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url: string;
                id: string;
                platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
                title: string;
                duration?: number | undefined;
                width?: number | undefined;
                height?: number | undefined;
                thumbnail?: string | undefined;
                mediaAsset?: {
                    url: string;
                    id: string;
                    source: "generated" | "stock" | "uploaded" | "reference";
                    prompt?: string | undefined;
                    duration?: number | undefined;
                    provider?: string | undefined;
                    model?: string | undefined;
                    mimeType?: string | undefined;
                    generatedAt?: string | undefined;
                    width?: number | undefined;
                    height?: number | undefined;
                    license?: string | undefined;
                    attribution?: string | undefined;
                } | undefined;
            } | undefined;
            exactDuration?: number | undefined;
            imagePrompt?: string | undefined;
            audioUrl?: string | undefined;
            mediaAsset?: {
                url: string;
                id: string;
                source: "generated" | "stock" | "uploaded" | "reference";
                prompt?: string | undefined;
                duration?: number | undefined;
                provider?: string | undefined;
                model?: string | undefined;
                mimeType?: string | undefined;
                generatedAt?: string | undefined;
                width?: number | undefined;
                height?: number | undefined;
                license?: string | undefined;
                attribution?: string | undefined;
            } | undefined;
            emotion?: string | undefined;
            cameraMotion?: string | undefined;
            visualPrompt?: string | undefined;
        }, {
            id: string;
            text: string;
            duration: number;
            description: string;
            keywords: string[];
            wordTimestamps?: {
                word: string;
                start: number;
                end: number;
                confidence?: number | undefined;
            }[] | undefined;
            imageUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url: string;
                id: string;
                platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
                title: string;
                duration?: number | undefined;
                width?: number | undefined;
                height?: number | undefined;
                thumbnail?: string | undefined;
                mediaAsset?: {
                    url: string;
                    id: string;
                    source: "generated" | "stock" | "uploaded" | "reference";
                    prompt?: string | undefined;
                    duration?: number | undefined;
                    provider?: string | undefined;
                    model?: string | undefined;
                    mimeType?: string | undefined;
                    generatedAt?: string | undefined;
                    width?: number | undefined;
                    height?: number | undefined;
                    license?: string | undefined;
                    attribution?: string | undefined;
                } | undefined;
            } | undefined;
            exactDuration?: number | undefined;
            imagePrompt?: string | undefined;
            audioUrl?: string | undefined;
            mediaAsset?: {
                url: string;
                id: string;
                source: "generated" | "stock" | "uploaded" | "reference";
                prompt?: string | undefined;
                duration?: number | undefined;
                provider?: string | undefined;
                model?: string | undefined;
                mimeType?: string | undefined;
                generatedAt?: string | undefined;
                width?: number | undefined;
                height?: number | undefined;
                license?: string | undefined;
                attribution?: string | undefined;
            } | undefined;
            emotion?: string | undefined;
            cameraMotion?: string | undefined;
            visualPrompt?: string | undefined;
        }>, "many">;
        totalDuration: z.ZodNumber;
        title: z.ZodOptional<z.ZodString>;
        summary: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        script: string;
        scenes: {
            id: string;
            text: string;
            duration: number;
            description: string;
            keywords: string[];
            wordTimestamps?: {
                word: string;
                start: number;
                end: number;
                confidence?: number | undefined;
            }[] | undefined;
            imageUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url: string;
                id: string;
                platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
                title: string;
                duration?: number | undefined;
                width?: number | undefined;
                height?: number | undefined;
                thumbnail?: string | undefined;
                mediaAsset?: {
                    url: string;
                    id: string;
                    source: "generated" | "stock" | "uploaded" | "reference";
                    prompt?: string | undefined;
                    duration?: number | undefined;
                    provider?: string | undefined;
                    model?: string | undefined;
                    mimeType?: string | undefined;
                    generatedAt?: string | undefined;
                    width?: number | undefined;
                    height?: number | undefined;
                    license?: string | undefined;
                    attribution?: string | undefined;
                } | undefined;
            } | undefined;
            exactDuration?: number | undefined;
            imagePrompt?: string | undefined;
            audioUrl?: string | undefined;
            mediaAsset?: {
                url: string;
                id: string;
                source: "generated" | "stock" | "uploaded" | "reference";
                prompt?: string | undefined;
                duration?: number | undefined;
                provider?: string | undefined;
                model?: string | undefined;
                mimeType?: string | undefined;
                generatedAt?: string | undefined;
                width?: number | undefined;
                height?: number | undefined;
                license?: string | undefined;
                attribution?: string | undefined;
            } | undefined;
            emotion?: string | undefined;
            cameraMotion?: string | undefined;
            visualPrompt?: string | undefined;
        }[];
        totalDuration: number;
        title?: string | undefined;
        summary?: string | undefined;
    }, {
        script: string;
        scenes: {
            id: string;
            text: string;
            duration: number;
            description: string;
            keywords: string[];
            wordTimestamps?: {
                word: string;
                start: number;
                end: number;
                confidence?: number | undefined;
            }[] | undefined;
            imageUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url: string;
                id: string;
                platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
                title: string;
                duration?: number | undefined;
                width?: number | undefined;
                height?: number | undefined;
                thumbnail?: string | undefined;
                mediaAsset?: {
                    url: string;
                    id: string;
                    source: "generated" | "stock" | "uploaded" | "reference";
                    prompt?: string | undefined;
                    duration?: number | undefined;
                    provider?: string | undefined;
                    model?: string | undefined;
                    mimeType?: string | undefined;
                    generatedAt?: string | undefined;
                    width?: number | undefined;
                    height?: number | undefined;
                    license?: string | undefined;
                    attribution?: string | undefined;
                } | undefined;
            } | undefined;
            exactDuration?: number | undefined;
            imagePrompt?: string | undefined;
            audioUrl?: string | undefined;
            mediaAsset?: {
                url: string;
                id: string;
                source: "generated" | "stock" | "uploaded" | "reference";
                prompt?: string | undefined;
                duration?: number | undefined;
                provider?: string | undefined;
                model?: string | undefined;
                mimeType?: string | undefined;
                generatedAt?: string | undefined;
                width?: number | undefined;
                height?: number | undefined;
                license?: string | undefined;
                attribution?: string | undefined;
            } | undefined;
            emotion?: string | undefined;
            cameraMotion?: string | undefined;
            visualPrompt?: string | undefined;
        }[];
        totalDuration: number;
        title?: string | undefined;
        summary?: string | undefined;
    }>;
    videos: z.ZodArray<z.ZodObject<{
        video: z.ZodObject<{
            id: z.ZodString;
            url: z.ZodString;
            title: z.ZodString;
            platform: z.ZodEnum<["pixabay", "pexels", "unsplash", "coverr", "mixkit", "videvo", "openverse"]>;
            thumbnail: z.ZodOptional<z.ZodString>;
            duration: z.ZodOptional<z.ZodNumber>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
            mediaAsset: z.ZodOptional<z.ZodObject<{
                id: z.ZodString;
                url: z.ZodString;
                source: z.ZodEnum<["generated", "stock", "uploaded", "reference"]>;
                provider: z.ZodOptional<z.ZodString>;
                model: z.ZodOptional<z.ZodString>;
                prompt: z.ZodOptional<z.ZodString>;
                width: z.ZodOptional<z.ZodNumber>;
                height: z.ZodOptional<z.ZodNumber>;
                duration: z.ZodOptional<z.ZodNumber>;
                mimeType: z.ZodOptional<z.ZodString>;
                license: z.ZodOptional<z.ZodString>;
                attribution: z.ZodOptional<z.ZodString>;
                generatedAt: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                url: string;
                id: string;
                source: "generated" | "stock" | "uploaded" | "reference";
                prompt?: string | undefined;
                duration?: number | undefined;
                provider?: string | undefined;
                model?: string | undefined;
                mimeType?: string | undefined;
                generatedAt?: string | undefined;
                width?: number | undefined;
                height?: number | undefined;
                license?: string | undefined;
                attribution?: string | undefined;
            }, {
                url: string;
                id: string;
                source: "generated" | "stock" | "uploaded" | "reference";
                prompt?: string | undefined;
                duration?: number | undefined;
                provider?: string | undefined;
                model?: string | undefined;
                mimeType?: string | undefined;
                generatedAt?: string | undefined;
                width?: number | undefined;
                height?: number | undefined;
                license?: string | undefined;
                attribution?: string | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            url: string;
            id: string;
            platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
            mediaAsset?: {
                url: string;
                id: string;
                source: "generated" | "stock" | "uploaded" | "reference";
                prompt?: string | undefined;
                duration?: number | undefined;
                provider?: string | undefined;
                model?: string | undefined;
                mimeType?: string | undefined;
                generatedAt?: string | undefined;
                width?: number | undefined;
                height?: number | undefined;
                license?: string | undefined;
                attribution?: string | undefined;
            } | undefined;
        }, {
            url: string;
            id: string;
            platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
            mediaAsset?: {
                url: string;
                id: string;
                source: "generated" | "stock" | "uploaded" | "reference";
                prompt?: string | undefined;
                duration?: number | undefined;
                provider?: string | undefined;
                model?: string | undefined;
                mimeType?: string | undefined;
                generatedAt?: string | undefined;
                width?: number | undefined;
                height?: number | undefined;
                license?: string | undefined;
                attribution?: string | undefined;
            } | undefined;
        }>;
        score: z.ZodNumber;
        reason: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        video: {
            url: string;
            id: string;
            platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
            mediaAsset?: {
                url: string;
                id: string;
                source: "generated" | "stock" | "uploaded" | "reference";
                prompt?: string | undefined;
                duration?: number | undefined;
                provider?: string | undefined;
                model?: string | undefined;
                mimeType?: string | undefined;
                generatedAt?: string | undefined;
                width?: number | undefined;
                height?: number | undefined;
                license?: string | undefined;
                attribution?: string | undefined;
            } | undefined;
        };
        score: number;
        reason: string;
    }, {
        video: {
            url: string;
            id: string;
            platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
            mediaAsset?: {
                url: string;
                id: string;
                source: "generated" | "stock" | "uploaded" | "reference";
                prompt?: string | undefined;
                duration?: number | undefined;
                provider?: string | undefined;
                model?: string | undefined;
                mimeType?: string | undefined;
                generatedAt?: string | undefined;
                width?: number | undefined;
                height?: number | undefined;
                license?: string | undefined;
                attribution?: string | undefined;
            } | undefined;
        };
        score: number;
        reason: string;
    }>, "many">;
    videoUrl: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "completed" | "failed" | "rendering" | "generating";
    analysis: {
        script: string;
        scenes: {
            id: string;
            text: string;
            duration: number;
            description: string;
            keywords: string[];
            wordTimestamps?: {
                word: string;
                start: number;
                end: number;
                confidence?: number | undefined;
            }[] | undefined;
            imageUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url: string;
                id: string;
                platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
                title: string;
                duration?: number | undefined;
                width?: number | undefined;
                height?: number | undefined;
                thumbnail?: string | undefined;
                mediaAsset?: {
                    url: string;
                    id: string;
                    source: "generated" | "stock" | "uploaded" | "reference";
                    prompt?: string | undefined;
                    duration?: number | undefined;
                    provider?: string | undefined;
                    model?: string | undefined;
                    mimeType?: string | undefined;
                    generatedAt?: string | undefined;
                    width?: number | undefined;
                    height?: number | undefined;
                    license?: string | undefined;
                    attribution?: string | undefined;
                } | undefined;
            } | undefined;
            exactDuration?: number | undefined;
            imagePrompt?: string | undefined;
            audioUrl?: string | undefined;
            mediaAsset?: {
                url: string;
                id: string;
                source: "generated" | "stock" | "uploaded" | "reference";
                prompt?: string | undefined;
                duration?: number | undefined;
                provider?: string | undefined;
                model?: string | undefined;
                mimeType?: string | undefined;
                generatedAt?: string | undefined;
                width?: number | undefined;
                height?: number | undefined;
                license?: string | undefined;
                attribution?: string | undefined;
            } | undefined;
            emotion?: string | undefined;
            cameraMotion?: string | undefined;
            visualPrompt?: string | undefined;
        }[];
        totalDuration: number;
        title?: string | undefined;
        summary?: string | undefined;
    };
    success: boolean;
    jobId: string;
    videos: {
        video: {
            url: string;
            id: string;
            platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
            mediaAsset?: {
                url: string;
                id: string;
                source: "generated" | "stock" | "uploaded" | "reference";
                prompt?: string | undefined;
                duration?: number | undefined;
                provider?: string | undefined;
                model?: string | undefined;
                mimeType?: string | undefined;
                generatedAt?: string | undefined;
                width?: number | undefined;
                height?: number | undefined;
                license?: string | undefined;
                attribution?: string | undefined;
            } | undefined;
        };
        score: number;
        reason: string;
    }[];
    videoUrl?: string | undefined;
    error?: string | undefined;
}, {
    status: "pending" | "completed" | "failed" | "rendering" | "generating";
    analysis: {
        script: string;
        scenes: {
            id: string;
            text: string;
            duration: number;
            description: string;
            keywords: string[];
            wordTimestamps?: {
                word: string;
                start: number;
                end: number;
                confidence?: number | undefined;
            }[] | undefined;
            imageUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url: string;
                id: string;
                platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
                title: string;
                duration?: number | undefined;
                width?: number | undefined;
                height?: number | undefined;
                thumbnail?: string | undefined;
                mediaAsset?: {
                    url: string;
                    id: string;
                    source: "generated" | "stock" | "uploaded" | "reference";
                    prompt?: string | undefined;
                    duration?: number | undefined;
                    provider?: string | undefined;
                    model?: string | undefined;
                    mimeType?: string | undefined;
                    generatedAt?: string | undefined;
                    width?: number | undefined;
                    height?: number | undefined;
                    license?: string | undefined;
                    attribution?: string | undefined;
                } | undefined;
            } | undefined;
            exactDuration?: number | undefined;
            imagePrompt?: string | undefined;
            audioUrl?: string | undefined;
            mediaAsset?: {
                url: string;
                id: string;
                source: "generated" | "stock" | "uploaded" | "reference";
                prompt?: string | undefined;
                duration?: number | undefined;
                provider?: string | undefined;
                model?: string | undefined;
                mimeType?: string | undefined;
                generatedAt?: string | undefined;
                width?: number | undefined;
                height?: number | undefined;
                license?: string | undefined;
                attribution?: string | undefined;
            } | undefined;
            emotion?: string | undefined;
            cameraMotion?: string | undefined;
            visualPrompt?: string | undefined;
        }[];
        totalDuration: number;
        title?: string | undefined;
        summary?: string | undefined;
    };
    success: boolean;
    jobId: string;
    videos: {
        video: {
            url: string;
            id: string;
            platform: "pixabay" | "pexels" | "unsplash" | "coverr" | "mixkit" | "videvo" | "openverse";
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
            mediaAsset?: {
                url: string;
                id: string;
                source: "generated" | "stock" | "uploaded" | "reference";
                prompt?: string | undefined;
                duration?: number | undefined;
                provider?: string | undefined;
                model?: string | undefined;
                mimeType?: string | undefined;
                generatedAt?: string | undefined;
                width?: number | undefined;
                height?: number | undefined;
                license?: string | undefined;
                attribution?: string | undefined;
            } | undefined;
        };
        score: number;
        reason: string;
    }[];
    videoUrl?: string | undefined;
    error?: string | undefined;
}>;
export type GenerationResponse = z.infer<typeof GenerationResponseSchema>;
/**
 * Validation helpers
 */
export declare function validateMediaAsset(data: unknown): MediaAsset;
export declare function validateScene(data: unknown): Scene;
export declare function validateScriptAnalysis(data: unknown): ScriptAnalysis;
//# sourceMappingURL=media.d.ts.map