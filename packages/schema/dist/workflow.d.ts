import { z } from 'zod';
/**
 * Workflow 1: AI Video Generator Types
 */
export declare const AIVideoModelSchema: z.ZodUnion<[z.ZodEnum<["kling-v1", "luma-dream", "fal-flux", "alibaba/wan-3.0-prime/text-to-video"]>, z.ZodString]>;
export declare const CameraMotionSchema: z.ZodEnum<["static", "zoom_in", "zoom_out", "pan_left", "pan_right", "orbit", "drone", "tilt_up", "tilt_down"]>;
export declare const AIVideoGenerationRequestSchema: z.ZodObject<{
    script: z.ZodString;
    prompt: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodUnion<[z.ZodEnum<["kling-v1", "luma-dream", "fal-flux", "alibaba/wan-3.0-prime/text-to-video"]>, z.ZodString]>>;
    aspectRatio: z.ZodOptional<z.ZodEnum<["16:9", "9:16", "1:1"]>>;
    duration: z.ZodOptional<z.ZodNumber>;
    cameraMotion: z.ZodOptional<z.ZodEnum<["static", "zoom_in", "zoom_out", "pan_left", "pan_right", "orbit", "drone", "tilt_up", "tilt_down"]>>;
    negativePrompt: z.ZodOptional<z.ZodString>;
    style: z.ZodOptional<z.ZodString>;
    voice: z.ZodOptional<z.ZodString>;
    mock: z.ZodDefault<z.ZodBoolean>;
    characterSheetUrl: z.ZodOptional<z.ZodString>;
    seed: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    mock: boolean;
    script: string;
    prompt?: string | undefined;
    duration?: number | undefined;
    voice?: string | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
    model?: string | undefined;
    cameraMotion?: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "orbit" | "drone" | "tilt_up" | "tilt_down" | undefined;
    style?: string | undefined;
    negativePrompt?: string | undefined;
    characterSheetUrl?: string | undefined;
    seed?: number | undefined;
}, {
    script: string;
    mock?: boolean | undefined;
    prompt?: string | undefined;
    duration?: number | undefined;
    voice?: string | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
    model?: string | undefined;
    cameraMotion?: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "orbit" | "drone" | "tilt_up" | "tilt_down" | undefined;
    style?: string | undefined;
    negativePrompt?: string | undefined;
    characterSheetUrl?: string | undefined;
    seed?: number | undefined;
}>;
export type AIVideoGenerationRequest = z.infer<typeof AIVideoGenerationRequestSchema>;
export declare const AIVideoGenerationResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    jobId: z.ZodString;
    videoUrl: z.ZodString;
    prompt: z.ZodString;
    modelUsed: z.ZodString;
    duration: z.ZodNumber;
    metadata: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    duration: number;
    videoUrl: string;
    success: boolean;
    jobId: string;
    metadata: Record<string, unknown>;
    modelUsed: string;
    error?: string | undefined;
}, {
    prompt: string;
    duration: number;
    videoUrl: string;
    success: boolean;
    jobId: string;
    metadata: Record<string, unknown>;
    modelUsed: string;
    error?: string | undefined;
}>;
export type AIVideoGenerationResponse = z.infer<typeof AIVideoGenerationResponseSchema>;
/**
 * Workflow 2: Stories Orchestrator Types
 */
export declare const StoryPartSchema: z.ZodObject<{
    partNumber: z.ZodNumber;
    title: z.ZodString;
    script: z.ZodString;
    hook: z.ZodString;
    cliffhanger: z.ZodString;
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
            platform: z.ZodString;
            thumbnail: z.ZodOptional<z.ZodString>;
            duration: z.ZodOptional<z.ZodNumber>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            url: string;
            id: string;
            platform: string;
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
        }, {
            url: string;
            id: string;
            platform: string;
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
        }>>;
        imageUrl: z.ZodOptional<z.ZodString>;
        videoUrl: z.ZodOptional<z.ZodString>;
        audioUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        text: string;
        duration: number;
        description: string;
        keywords: string[];
        imageUrl?: string | undefined;
        videoUrl?: string | undefined;
        selectedVideo?: {
            url: string;
            id: string;
            platform: string;
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
        } | undefined;
        imagePrompt?: string | undefined;
        audioUrl?: string | undefined;
        emotion?: string | undefined;
        cameraMotion?: string | undefined;
        visualPrompt?: string | undefined;
    }, {
        id: string;
        text: string;
        duration: number;
        description: string;
        keywords: string[];
        imageUrl?: string | undefined;
        videoUrl?: string | undefined;
        selectedVideo?: {
            url: string;
            id: string;
            platform: string;
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
        } | undefined;
        imagePrompt?: string | undefined;
        audioUrl?: string | undefined;
        emotion?: string | undefined;
        cameraMotion?: string | undefined;
        visualPrompt?: string | undefined;
    }>, "many">;
    estimatedDuration: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    script: string;
    scenes: {
        id: string;
        text: string;
        duration: number;
        description: string;
        keywords: string[];
        imageUrl?: string | undefined;
        videoUrl?: string | undefined;
        selectedVideo?: {
            url: string;
            id: string;
            platform: string;
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
        } | undefined;
        imagePrompt?: string | undefined;
        audioUrl?: string | undefined;
        emotion?: string | undefined;
        cameraMotion?: string | undefined;
        visualPrompt?: string | undefined;
    }[];
    title: string;
    partNumber: number;
    hook: string;
    cliffhanger: string;
    estimatedDuration?: number | undefined;
}, {
    script: string;
    scenes: {
        id: string;
        text: string;
        duration: number;
        description: string;
        keywords: string[];
        imageUrl?: string | undefined;
        videoUrl?: string | undefined;
        selectedVideo?: {
            url: string;
            id: string;
            platform: string;
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
        } | undefined;
        imagePrompt?: string | undefined;
        audioUrl?: string | undefined;
        emotion?: string | undefined;
        cameraMotion?: string | undefined;
        visualPrompt?: string | undefined;
    }[];
    title: string;
    partNumber: number;
    hook: string;
    cliffhanger: string;
    estimatedDuration?: number | undefined;
}>;
export type StoryPart = z.infer<typeof StoryPartSchema>;
export declare const StorySeriesRequestSchema: z.ZodObject<{
    topic: z.ZodString;
    storyType: z.ZodString;
    partsCount: z.ZodNumber;
    visualStyle: z.ZodString;
    voice: z.ZodOptional<z.ZodString>;
    aspectRatio: z.ZodOptional<z.ZodEnum<["16:9", "9:16", "1:1"]>>;
    includeHooks: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    topic: string;
    storyType: string;
    partsCount: number;
    visualStyle: string;
    voice?: string | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
    includeHooks?: boolean | undefined;
}, {
    topic: string;
    storyType: string;
    partsCount: number;
    visualStyle: string;
    voice?: string | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
    includeHooks?: boolean | undefined;
}>;
export type StorySeriesRequest = z.infer<typeof StorySeriesRequestSchema>;
export declare const StorySeriesResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    seriesTitle: z.ZodString;
    parts: z.ZodArray<z.ZodObject<{
        partNumber: z.ZodNumber;
        title: z.ZodString;
        script: z.ZodString;
        hook: z.ZodString;
        cliffhanger: z.ZodString;
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
                platform: z.ZodString;
                thumbnail: z.ZodOptional<z.ZodString>;
                duration: z.ZodOptional<z.ZodNumber>;
                width: z.ZodOptional<z.ZodNumber>;
                height: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                url: string;
                id: string;
                platform: string;
                title: string;
                duration?: number | undefined;
                width?: number | undefined;
                height?: number | undefined;
                thumbnail?: string | undefined;
            }, {
                url: string;
                id: string;
                platform: string;
                title: string;
                duration?: number | undefined;
                width?: number | undefined;
                height?: number | undefined;
                thumbnail?: string | undefined;
            }>>;
            imageUrl: z.ZodOptional<z.ZodString>;
            videoUrl: z.ZodOptional<z.ZodString>;
            audioUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            text: string;
            duration: number;
            description: string;
            keywords: string[];
            imageUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url: string;
                id: string;
                platform: string;
                title: string;
                duration?: number | undefined;
                width?: number | undefined;
                height?: number | undefined;
                thumbnail?: string | undefined;
            } | undefined;
            imagePrompt?: string | undefined;
            audioUrl?: string | undefined;
            emotion?: string | undefined;
            cameraMotion?: string | undefined;
            visualPrompt?: string | undefined;
        }, {
            id: string;
            text: string;
            duration: number;
            description: string;
            keywords: string[];
            imageUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url: string;
                id: string;
                platform: string;
                title: string;
                duration?: number | undefined;
                width?: number | undefined;
                height?: number | undefined;
                thumbnail?: string | undefined;
            } | undefined;
            imagePrompt?: string | undefined;
            audioUrl?: string | undefined;
            emotion?: string | undefined;
            cameraMotion?: string | undefined;
            visualPrompt?: string | undefined;
        }>, "many">;
        estimatedDuration: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        script: string;
        scenes: {
            id: string;
            text: string;
            duration: number;
            description: string;
            keywords: string[];
            imageUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url: string;
                id: string;
                platform: string;
                title: string;
                duration?: number | undefined;
                width?: number | undefined;
                height?: number | undefined;
                thumbnail?: string | undefined;
            } | undefined;
            imagePrompt?: string | undefined;
            audioUrl?: string | undefined;
            emotion?: string | undefined;
            cameraMotion?: string | undefined;
            visualPrompt?: string | undefined;
        }[];
        title: string;
        partNumber: number;
        hook: string;
        cliffhanger: string;
        estimatedDuration?: number | undefined;
    }, {
        script: string;
        scenes: {
            id: string;
            text: string;
            duration: number;
            description: string;
            keywords: string[];
            imageUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url: string;
                id: string;
                platform: string;
                title: string;
                duration?: number | undefined;
                width?: number | undefined;
                height?: number | undefined;
                thumbnail?: string | undefined;
            } | undefined;
            imagePrompt?: string | undefined;
            audioUrl?: string | undefined;
            emotion?: string | undefined;
            cameraMotion?: string | undefined;
            visualPrompt?: string | undefined;
        }[];
        title: string;
        partNumber: number;
        hook: string;
        cliffhanger: string;
        estimatedDuration?: number | undefined;
    }>, "many">;
    metadata: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    metadata: Record<string, unknown>;
    seriesTitle: string;
    parts: {
        script: string;
        scenes: {
            id: string;
            text: string;
            duration: number;
            description: string;
            keywords: string[];
            imageUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url: string;
                id: string;
                platform: string;
                title: string;
                duration?: number | undefined;
                width?: number | undefined;
                height?: number | undefined;
                thumbnail?: string | undefined;
            } | undefined;
            imagePrompt?: string | undefined;
            audioUrl?: string | undefined;
            emotion?: string | undefined;
            cameraMotion?: string | undefined;
            visualPrompt?: string | undefined;
        }[];
        title: string;
        partNumber: number;
        hook: string;
        cliffhanger: string;
        estimatedDuration?: number | undefined;
    }[];
    error?: string | undefined;
}, {
    success: boolean;
    metadata: Record<string, unknown>;
    seriesTitle: string;
    parts: {
        script: string;
        scenes: {
            id: string;
            text: string;
            duration: number;
            description: string;
            keywords: string[];
            imageUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url: string;
                id: string;
                platform: string;
                title: string;
                duration?: number | undefined;
                width?: number | undefined;
                height?: number | undefined;
                thumbnail?: string | undefined;
            } | undefined;
            imagePrompt?: string | undefined;
            audioUrl?: string | undefined;
            emotion?: string | undefined;
            cameraMotion?: string | undefined;
            visualPrompt?: string | undefined;
        }[];
        title: string;
        partNumber: number;
        hook: string;
        cliffhanger: string;
        estimatedDuration?: number | undefined;
    }[];
    error?: string | undefined;
}>;
export type StorySeriesResponse = z.infer<typeof StorySeriesResponseSchema>;
/**
 * Workflow 3: Bulk Content Planner Types
 */
export declare const BulkPlanItemSchema: z.ZodObject<{
    day: z.ZodNumber;
    title: z.ZodString;
    hook: z.ZodString;
    script: z.ZodString;
    status: z.ZodString;
    visualPrompt: z.ZodOptional<z.ZodString>;
    targetPlatform: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    scheduledDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: string;
    script: string;
    title: string;
    hook: string;
    day: number;
    visualPrompt?: string | undefined;
    targetPlatform?: string | undefined;
    tags?: string[] | undefined;
    scheduledDate?: string | undefined;
}, {
    status: string;
    script: string;
    title: string;
    hook: string;
    day: number;
    visualPrompt?: string | undefined;
    targetPlatform?: string | undefined;
    tags?: string[] | undefined;
    scheduledDate?: string | undefined;
}>;
export type BulkPlanItem = z.infer<typeof BulkPlanItemSchema>;
export declare const BulkPlanRequestSchema: z.ZodObject<{
    niche: z.ZodString;
    contentCount: z.ZodNumber;
    cadence: z.ZodString;
    visualStyle: z.ZodString;
    voice: z.ZodOptional<z.ZodString>;
    platforms: z.ZodArray<z.ZodString, "many">;
    aspectRatio: z.ZodOptional<z.ZodEnum<["16:9", "9:16", "1:1"]>>;
}, "strip", z.ZodTypeAny, {
    platforms: string[];
    visualStyle: string;
    niche: string;
    contentCount: number;
    cadence: string;
    voice?: string | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
}, {
    platforms: string[];
    visualStyle: string;
    niche: string;
    contentCount: number;
    cadence: string;
    voice?: string | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
}>;
export type BulkPlanRequest = z.infer<typeof BulkPlanRequestSchema>;
export declare const BulkPlanResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    planTitle: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        day: z.ZodNumber;
        title: z.ZodString;
        hook: z.ZodString;
        script: z.ZodString;
        status: z.ZodString;
        visualPrompt: z.ZodOptional<z.ZodString>;
        targetPlatform: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        scheduledDate: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: string;
        script: string;
        title: string;
        hook: string;
        day: number;
        visualPrompt?: string | undefined;
        targetPlatform?: string | undefined;
        tags?: string[] | undefined;
        scheduledDate?: string | undefined;
    }, {
        status: string;
        script: string;
        title: string;
        hook: string;
        day: number;
        visualPrompt?: string | undefined;
        targetPlatform?: string | undefined;
        tags?: string[] | undefined;
        scheduledDate?: string | undefined;
    }>, "many">;
    batchJobIds: z.ZodArray<z.ZodString, "many">;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    planTitle: string;
    items: {
        status: string;
        script: string;
        title: string;
        hook: string;
        day: number;
        visualPrompt?: string | undefined;
        targetPlatform?: string | undefined;
        tags?: string[] | undefined;
        scheduledDate?: string | undefined;
    }[];
    batchJobIds: string[];
    error?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    success: boolean;
    planTitle: string;
    items: {
        status: string;
        script: string;
        title: string;
        hook: string;
        day: number;
        visualPrompt?: string | undefined;
        targetPlatform?: string | undefined;
        tags?: string[] | undefined;
        scheduledDate?: string | undefined;
    }[];
    batchJobIds: string[];
    error?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type BulkPlanResponse = z.infer<typeof BulkPlanResponseSchema>;
/**
 * Workflow 4: Micro-Drama Types
 */
export declare const DramaCharacterSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    visualAnchor: z.ZodString;
    voice: z.ZodOptional<z.ZodString>;
    avatarUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description: string;
    visualAnchor: string;
    voice?: string | undefined;
    avatarUrl?: string | undefined;
}, {
    name: string;
    description: string;
    visualAnchor: string;
    voice?: string | undefined;
    avatarUrl?: string | undefined;
}>;
export type DramaCharacter = z.infer<typeof DramaCharacterSchema>;
export declare const DramaEpisodeSchema: z.ZodObject<{
    episodeNumber: z.ZodNumber;
    title: z.ZodString;
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
            platform: z.ZodString;
            thumbnail: z.ZodOptional<z.ZodString>;
            duration: z.ZodOptional<z.ZodNumber>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            url: string;
            id: string;
            platform: string;
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
        }, {
            url: string;
            id: string;
            platform: string;
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
        }>>;
        imageUrl: z.ZodOptional<z.ZodString>;
        videoUrl: z.ZodOptional<z.ZodString>;
        audioUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        text: string;
        duration: number;
        description: string;
        keywords: string[];
        imageUrl?: string | undefined;
        videoUrl?: string | undefined;
        selectedVideo?: {
            url: string;
            id: string;
            platform: string;
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
        } | undefined;
        imagePrompt?: string | undefined;
        audioUrl?: string | undefined;
        emotion?: string | undefined;
        cameraMotion?: string | undefined;
        visualPrompt?: string | undefined;
    }, {
        id: string;
        text: string;
        duration: number;
        description: string;
        keywords: string[];
        imageUrl?: string | undefined;
        videoUrl?: string | undefined;
        selectedVideo?: {
            url: string;
            id: string;
            platform: string;
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
        } | undefined;
        imagePrompt?: string | undefined;
        audioUrl?: string | undefined;
        emotion?: string | undefined;
        cameraMotion?: string | undefined;
        visualPrompt?: string | undefined;
    }>, "many">;
    cliffhanger: z.ZodOptional<z.ZodString>;
    duration: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    script: string;
    scenes: {
        id: string;
        text: string;
        duration: number;
        description: string;
        keywords: string[];
        imageUrl?: string | undefined;
        videoUrl?: string | undefined;
        selectedVideo?: {
            url: string;
            id: string;
            platform: string;
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
        } | undefined;
        imagePrompt?: string | undefined;
        audioUrl?: string | undefined;
        emotion?: string | undefined;
        cameraMotion?: string | undefined;
        visualPrompt?: string | undefined;
    }[];
    title: string;
    episodeNumber: number;
    duration?: number | undefined;
    cliffhanger?: string | undefined;
}, {
    script: string;
    scenes: {
        id: string;
        text: string;
        duration: number;
        description: string;
        keywords: string[];
        imageUrl?: string | undefined;
        videoUrl?: string | undefined;
        selectedVideo?: {
            url: string;
            id: string;
            platform: string;
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
        } | undefined;
        imagePrompt?: string | undefined;
        audioUrl?: string | undefined;
        emotion?: string | undefined;
        cameraMotion?: string | undefined;
        visualPrompt?: string | undefined;
    }[];
    title: string;
    episodeNumber: number;
    duration?: number | undefined;
    cliffhanger?: string | undefined;
}>;
export type DramaEpisode = z.infer<typeof DramaEpisodeSchema>;
export declare const DramaSeriesRequestSchema: z.ZodObject<{
    script: z.ZodOptional<z.ZodString>;
    genre: z.ZodString;
    characters: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
        visualAnchor: z.ZodString;
        voice: z.ZodOptional<z.ZodString>;
        avatarUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        description: string;
        visualAnchor: string;
        voice?: string | undefined;
        avatarUrl?: string | undefined;
    }, {
        name: string;
        description: string;
        visualAnchor: string;
        voice?: string | undefined;
        avatarUrl?: string | undefined;
    }>, "many">;
    episodesCount: z.ZodNumber;
    aspectRatio: z.ZodOptional<z.ZodEnum<["16:9", "9:16", "1:1"]>>;
    visualStyle: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    genre: string;
    characters: {
        name: string;
        description: string;
        visualAnchor: string;
        voice?: string | undefined;
        avatarUrl?: string | undefined;
    }[];
    episodesCount: number;
    script?: string | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
    visualStyle?: string | undefined;
}, {
    genre: string;
    characters: {
        name: string;
        description: string;
        visualAnchor: string;
        voice?: string | undefined;
        avatarUrl?: string | undefined;
    }[];
    episodesCount: number;
    script?: string | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
    visualStyle?: string | undefined;
}>;
export type DramaSeriesRequest = z.infer<typeof DramaSeriesRequestSchema>;
export declare const DramaSeriesResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    dramaTitle: z.ZodString;
    characters: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        avatarUrl: z.ZodString;
        visualAnchor: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        visualAnchor: string;
        avatarUrl: string;
    }, {
        name: string;
        visualAnchor: string;
        avatarUrl: string;
    }>, "many">;
    episodes: z.ZodArray<z.ZodObject<{
        episodeNumber: z.ZodNumber;
        title: z.ZodString;
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
                platform: z.ZodString;
                thumbnail: z.ZodOptional<z.ZodString>;
                duration: z.ZodOptional<z.ZodNumber>;
                width: z.ZodOptional<z.ZodNumber>;
                height: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                url: string;
                id: string;
                platform: string;
                title: string;
                duration?: number | undefined;
                width?: number | undefined;
                height?: number | undefined;
                thumbnail?: string | undefined;
            }, {
                url: string;
                id: string;
                platform: string;
                title: string;
                duration?: number | undefined;
                width?: number | undefined;
                height?: number | undefined;
                thumbnail?: string | undefined;
            }>>;
            imageUrl: z.ZodOptional<z.ZodString>;
            videoUrl: z.ZodOptional<z.ZodString>;
            audioUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            text: string;
            duration: number;
            description: string;
            keywords: string[];
            imageUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url: string;
                id: string;
                platform: string;
                title: string;
                duration?: number | undefined;
                width?: number | undefined;
                height?: number | undefined;
                thumbnail?: string | undefined;
            } | undefined;
            imagePrompt?: string | undefined;
            audioUrl?: string | undefined;
            emotion?: string | undefined;
            cameraMotion?: string | undefined;
            visualPrompt?: string | undefined;
        }, {
            id: string;
            text: string;
            duration: number;
            description: string;
            keywords: string[];
            imageUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url: string;
                id: string;
                platform: string;
                title: string;
                duration?: number | undefined;
                width?: number | undefined;
                height?: number | undefined;
                thumbnail?: string | undefined;
            } | undefined;
            imagePrompt?: string | undefined;
            audioUrl?: string | undefined;
            emotion?: string | undefined;
            cameraMotion?: string | undefined;
            visualPrompt?: string | undefined;
        }>, "many">;
        cliffhanger: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        script: string;
        scenes: {
            id: string;
            text: string;
            duration: number;
            description: string;
            keywords: string[];
            imageUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url: string;
                id: string;
                platform: string;
                title: string;
                duration?: number | undefined;
                width?: number | undefined;
                height?: number | undefined;
                thumbnail?: string | undefined;
            } | undefined;
            imagePrompt?: string | undefined;
            audioUrl?: string | undefined;
            emotion?: string | undefined;
            cameraMotion?: string | undefined;
            visualPrompt?: string | undefined;
        }[];
        title: string;
        episodeNumber: number;
        duration?: number | undefined;
        cliffhanger?: string | undefined;
    }, {
        script: string;
        scenes: {
            id: string;
            text: string;
            duration: number;
            description: string;
            keywords: string[];
            imageUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url: string;
                id: string;
                platform: string;
                title: string;
                duration?: number | undefined;
                width?: number | undefined;
                height?: number | undefined;
                thumbnail?: string | undefined;
            } | undefined;
            imagePrompt?: string | undefined;
            audioUrl?: string | undefined;
            emotion?: string | undefined;
            cameraMotion?: string | undefined;
            visualPrompt?: string | undefined;
        }[];
        title: string;
        episodeNumber: number;
        duration?: number | undefined;
        cliffhanger?: string | undefined;
    }>, "many">;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    characters: {
        name: string;
        visualAnchor: string;
        avatarUrl: string;
    }[];
    dramaTitle: string;
    episodes: {
        script: string;
        scenes: {
            id: string;
            text: string;
            duration: number;
            description: string;
            keywords: string[];
            imageUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url: string;
                id: string;
                platform: string;
                title: string;
                duration?: number | undefined;
                width?: number | undefined;
                height?: number | undefined;
                thumbnail?: string | undefined;
            } | undefined;
            imagePrompt?: string | undefined;
            audioUrl?: string | undefined;
            emotion?: string | undefined;
            cameraMotion?: string | undefined;
            visualPrompt?: string | undefined;
        }[];
        title: string;
        episodeNumber: number;
        duration?: number | undefined;
        cliffhanger?: string | undefined;
    }[];
    error?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    success: boolean;
    characters: {
        name: string;
        visualAnchor: string;
        avatarUrl: string;
    }[];
    dramaTitle: string;
    episodes: {
        script: string;
        scenes: {
            id: string;
            text: string;
            duration: number;
            description: string;
            keywords: string[];
            imageUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url: string;
                id: string;
                platform: string;
                title: string;
                duration?: number | undefined;
                width?: number | undefined;
                height?: number | undefined;
                thumbnail?: string | undefined;
            } | undefined;
            imagePrompt?: string | undefined;
            audioUrl?: string | undefined;
            emotion?: string | undefined;
            cameraMotion?: string | undefined;
            visualPrompt?: string | undefined;
        }[];
        title: string;
        episodeNumber: number;
        duration?: number | undefined;
        cliffhanger?: string | undefined;
    }[];
    error?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type DramaSeriesResponse = z.infer<typeof DramaSeriesResponseSchema>;
/**
 * Workflow 5: Shorts Extractor Types
 */
export declare const ExtractedClipSchema: z.ZodObject<{
    clipId: z.ZodString;
    title: z.ZodString;
    hook: z.ZodString;
    startTime: z.ZodNumber;
    endTime: z.ZodNumber;
    viralScore: z.ZodNumber;
    reason: z.ZodString;
    transcriptSegment: z.ZodOptional<z.ZodString>;
    videoUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title: string;
    reason: string;
    hook: string;
    clipId: string;
    startTime: number;
    endTime: number;
    viralScore: number;
    videoUrl?: string | undefined;
    transcriptSegment?: string | undefined;
}, {
    title: string;
    reason: string;
    hook: string;
    clipId: string;
    startTime: number;
    endTime: number;
    viralScore: number;
    videoUrl?: string | undefined;
    transcriptSegment?: string | undefined;
}>;
export type ExtractedClip = z.infer<typeof ExtractedClipSchema>;
export declare const ShortsExtractionRequestSchema: z.ZodObject<{
    sourceType: z.ZodEnum<["url", "transcript", "file"]>;
    videoUrl: z.ZodOptional<z.ZodString>;
    transcript: z.ZodOptional<z.ZodString>;
    clipCount: z.ZodOptional<z.ZodNumber>;
    strategy: z.ZodOptional<z.ZodString>;
    captionStyle: z.ZodOptional<z.ZodString>;
    aspectRatio: z.ZodOptional<z.ZodEnum<["16:9", "9:16", "1:1"]>>;
}, "strip", z.ZodTypeAny, {
    sourceType: "url" | "transcript" | "file";
    transcript?: string | undefined;
    videoUrl?: string | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
    clipCount?: number | undefined;
    strategy?: string | undefined;
    captionStyle?: string | undefined;
}, {
    sourceType: "url" | "transcript" | "file";
    transcript?: string | undefined;
    videoUrl?: string | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
    clipCount?: number | undefined;
    strategy?: string | undefined;
    captionStyle?: string | undefined;
}>;
export type ShortsExtractionRequest = z.infer<typeof ShortsExtractionRequestSchema>;
export declare const ShortsExtractionResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    originalDuration: z.ZodNumber;
    clips: z.ZodArray<z.ZodObject<{
        clipId: z.ZodString;
        title: z.ZodString;
        hook: z.ZodString;
        startTime: z.ZodNumber;
        endTime: z.ZodNumber;
        viralScore: z.ZodNumber;
        reason: z.ZodString;
        transcriptSegment: z.ZodOptional<z.ZodString>;
        videoUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        reason: string;
        hook: string;
        clipId: string;
        startTime: number;
        endTime: number;
        viralScore: number;
        videoUrl?: string | undefined;
        transcriptSegment?: string | undefined;
    }, {
        title: string;
        reason: string;
        hook: string;
        clipId: string;
        startTime: number;
        endTime: number;
        viralScore: number;
        videoUrl?: string | undefined;
        transcriptSegment?: string | undefined;
    }>, "many">;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    originalDuration: number;
    clips: {
        title: string;
        reason: string;
        hook: string;
        clipId: string;
        startTime: number;
        endTime: number;
        viralScore: number;
        videoUrl?: string | undefined;
        transcriptSegment?: string | undefined;
    }[];
    error?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    success: boolean;
    originalDuration: number;
    clips: {
        title: string;
        reason: string;
        hook: string;
        clipId: string;
        startTime: number;
        endTime: number;
        viralScore: number;
        videoUrl?: string | undefined;
        transcriptSegment?: string | undefined;
    }[];
    error?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type ShortsExtractionResponse = z.infer<typeof ShortsExtractionResponseSchema>;
/**
 * Workflow 6: Auto Pilot Types
 */
export declare const AutoPilotConfigSchema: z.ZodObject<{
    pipelineName: z.ZodString;
    niche: z.ZodString;
    schedule: z.ZodString;
    sourceStrategy: z.ZodString;
    visualPipeline: z.ZodString;
    autoPublish: z.ZodBoolean;
    targetPlatforms: z.ZodArray<z.ZodString, "many">;
    voice: z.ZodOptional<z.ZodString>;
    visualStyle: z.ZodOptional<z.ZodString>;
    aspectRatio: z.ZodOptional<z.ZodEnum<["16:9", "9:16", "1:1"]>>;
}, "strip", z.ZodTypeAny, {
    niche: string;
    pipelineName: string;
    schedule: string;
    sourceStrategy: string;
    visualPipeline: string;
    autoPublish: boolean;
    targetPlatforms: string[];
    voice?: string | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
    visualStyle?: string | undefined;
}, {
    niche: string;
    pipelineName: string;
    schedule: string;
    sourceStrategy: string;
    visualPipeline: string;
    autoPublish: boolean;
    targetPlatforms: string[];
    voice?: string | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
    visualStyle?: string | undefined;
}>;
export type AutoPilotConfig = z.infer<typeof AutoPilotConfigSchema>;
export declare const AutoPilotResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    pipelineId: z.ZodString;
    nextRun: z.ZodString;
    generatedJobId: z.ZodOptional<z.ZodString>;
    status: z.ZodString;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: string;
    success: boolean;
    pipelineId: string;
    nextRun: string;
    error?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    generatedJobId?: string | undefined;
}, {
    status: string;
    success: boolean;
    pipelineId: string;
    nextRun: string;
    error?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    generatedJobId?: string | undefined;
}>;
export type AutoPilotResponse = z.infer<typeof AutoPilotResponseSchema>;
/**
 * Avatar Types
 */
export declare const AvatarProviderSchema: z.ZodEnum<["heygen", "did", "liveportrait", "remotion-pip", "mock"]>;
export declare const AvatarLayoutSchema: z.ZodEnum<["pip_bottom_right", "pip_bottom_left", "fullscreen", "side_by_side", "circular_bubble"]>;
export declare const AvatarVoiceSchema: z.ZodUnion<[z.ZodEnum<["nova", "onyx", "rachel", "josh", "alloy", "shimmer"]>, z.ZodString]>;
export declare const AvatarPresetSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    previewUrl: z.ZodString;
    gender: z.ZodEnum<["male", "female", "neutral"]>;
    style: z.ZodEnum<["photorealistic", "3d_animated", "anime", "illustrated"]>;
    supportedProviders: z.ZodArray<z.ZodEnum<["heygen", "did", "liveportrait", "remotion-pip", "mock"]>, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    previewUrl: string;
    gender: "male" | "female" | "neutral";
    name: string;
    style: "photorealistic" | "3d_animated" | "anime" | "illustrated";
    supportedProviders: ("mock" | "heygen" | "did" | "liveportrait" | "remotion-pip")[];
}, {
    id: string;
    previewUrl: string;
    gender: "male" | "female" | "neutral";
    name: string;
    style: "photorealistic" | "3d_animated" | "anime" | "illustrated";
    supportedProviders: ("mock" | "heygen" | "did" | "liveportrait" | "remotion-pip")[];
}>;
export type AvatarPreset = z.infer<typeof AvatarPresetSchema>;
export declare const AvatarConfigSchema: z.ZodObject<{
    avatarType: z.ZodEnum<["preset", "custom_photo"]>;
    avatarId: z.ZodOptional<z.ZodString>;
    customImageUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    layout: z.ZodOptional<z.ZodEnum<["pip_bottom_right", "pip_bottom_left", "fullscreen", "side_by_side", "circular_bubble"]>>;
    voice: z.ZodOptional<z.ZodUnion<[z.ZodEnum<["nova", "onyx", "rachel", "josh", "alloy", "shimmer"]>, z.ZodString]>>;
    speed: z.ZodOptional<z.ZodNumber>;
    aspectRatio: z.ZodOptional<z.ZodEnum<["16:9", "9:16", "1:1"]>>;
    backgroundVideoUrl: z.ZodOptional<z.ZodString>;
    backgroundMusicUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    avatarType: "preset" | "custom_photo";
    voice?: string | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
    speed?: number | undefined;
    avatarId?: string | undefined;
    customImageUrl?: string | null | undefined;
    layout?: "pip_bottom_right" | "pip_bottom_left" | "fullscreen" | "side_by_side" | "circular_bubble" | undefined;
    backgroundVideoUrl?: string | undefined;
    backgroundMusicUrl?: string | undefined;
}, {
    avatarType: "preset" | "custom_photo";
    voice?: string | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
    speed?: number | undefined;
    avatarId?: string | undefined;
    customImageUrl?: string | null | undefined;
    layout?: "pip_bottom_right" | "pip_bottom_left" | "fullscreen" | "side_by_side" | "circular_bubble" | undefined;
    backgroundVideoUrl?: string | undefined;
    backgroundMusicUrl?: string | undefined;
}>;
export type AvatarConfig = z.infer<typeof AvatarConfigSchema>;
export declare const AvatarGenerationRequestSchema: z.ZodObject<{
    avatarType: z.ZodEnum<["preset", "custom_photo"]>;
    avatarId: z.ZodOptional<z.ZodString>;
    customImageUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    layout: z.ZodOptional<z.ZodEnum<["pip_bottom_right", "pip_bottom_left", "fullscreen", "side_by_side", "circular_bubble"]>>;
    voice: z.ZodOptional<z.ZodUnion<[z.ZodEnum<["nova", "onyx", "rachel", "josh", "alloy", "shimmer"]>, z.ZodString]>>;
    speed: z.ZodOptional<z.ZodNumber>;
    aspectRatio: z.ZodOptional<z.ZodEnum<["16:9", "9:16", "1:1"]>>;
    backgroundVideoUrl: z.ZodOptional<z.ZodString>;
    backgroundMusicUrl: z.ZodOptional<z.ZodString>;
} & {
    script: z.ZodString;
    mock: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    script: string;
    avatarType: "preset" | "custom_photo";
    mock?: boolean | undefined;
    voice?: string | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
    speed?: number | undefined;
    avatarId?: string | undefined;
    customImageUrl?: string | null | undefined;
    layout?: "pip_bottom_right" | "pip_bottom_left" | "fullscreen" | "side_by_side" | "circular_bubble" | undefined;
    backgroundVideoUrl?: string | undefined;
    backgroundMusicUrl?: string | undefined;
}, {
    script: string;
    avatarType: "preset" | "custom_photo";
    mock?: boolean | undefined;
    voice?: string | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
    speed?: number | undefined;
    avatarId?: string | undefined;
    customImageUrl?: string | null | undefined;
    layout?: "pip_bottom_right" | "pip_bottom_left" | "fullscreen" | "side_by_side" | "circular_bubble" | undefined;
    backgroundVideoUrl?: string | undefined;
    backgroundMusicUrl?: string | undefined;
}>;
export type AvatarGenerationRequest = z.infer<typeof AvatarGenerationRequestSchema>;
export declare const AvatarGenerationResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    jobId: z.ZodString;
    videoUrl: z.ZodString;
    avatarId: z.ZodString;
    duration: z.ZodNumber;
    layout: z.ZodEnum<["pip_bottom_right", "pip_bottom_left", "fullscreen", "side_by_side", "circular_bubble"]>;
    providerUsed: z.ZodString;
    metadata: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    duration: number;
    videoUrl: string;
    success: boolean;
    jobId: string;
    providerUsed: string;
    metadata: Record<string, unknown>;
    avatarId: string;
    layout: "pip_bottom_right" | "pip_bottom_left" | "fullscreen" | "side_by_side" | "circular_bubble";
    error?: string | undefined;
}, {
    duration: number;
    videoUrl: string;
    success: boolean;
    jobId: string;
    providerUsed: string;
    metadata: Record<string, unknown>;
    avatarId: string;
    layout: "pip_bottom_right" | "pip_bottom_left" | "fullscreen" | "side_by_side" | "circular_bubble";
    error?: string | undefined;
}>;
export type AvatarGenerationResponse = z.infer<typeof AvatarGenerationResponseSchema>;
/**
 * Whiteboard Types
 */
export declare const WhiteboardArchetypeSchema: z.ZodEnum<["stickman", "saint", "old man", "founder", "doctor", "teacher", "scientist", "custom"]>;
export declare const WhiteboardStyleSchema: z.ZodEnum<["monoline_marker", "blackboard_chalk", "blueprint", "colored_doodle", "sketch_outline"]>;
export declare const CharacterPoseSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    bbox: z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>;
    svgPath: z.ZodOptional<z.ZodString>;
    previewUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description: string;
    bbox: [number, number, number, number];
    previewUrl?: string | undefined;
    svgPath?: string | undefined;
}, {
    name: string;
    description: string;
    bbox: [number, number, number, number];
    previewUrl?: string | undefined;
    svgPath?: string | undefined;
}>;
export type CharacterPose = z.infer<typeof CharacterPoseSchema>;
export declare const CharacterReferenceSheetSchema: z.ZodObject<{
    characterId: z.ZodString;
    archetype: z.ZodUnion<[z.ZodEnum<["stickman", "saint", "old man", "founder", "doctor", "teacher", "scientist", "custom"]>, z.ZodString]>;
    customDescription: z.ZodOptional<z.ZodString>;
    sheetImageUrl: z.ZodString;
    poses: z.ZodRecord<z.ZodString, z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
        bbox: z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>;
        svgPath: z.ZodOptional<z.ZodString>;
        previewUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        description: string;
        bbox: [number, number, number, number];
        previewUrl?: string | undefined;
        svgPath?: string | undefined;
    }, {
        name: string;
        description: string;
        bbox: [number, number, number, number];
        previewUrl?: string | undefined;
        svgPath?: string | undefined;
    }>>;
    style: z.ZodUnion<[z.ZodEnum<["monoline_marker", "blackboard_chalk", "blueprint", "colored_doodle", "sketch_outline"]>, z.ZodString]>;
    createdAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    style: string;
    characterId: string;
    archetype: string;
    sheetImageUrl: string;
    poses: Record<string, {
        name: string;
        description: string;
        bbox: [number, number, number, number];
        previewUrl?: string | undefined;
        svgPath?: string | undefined;
    }>;
    customDescription?: string | undefined;
    createdAt?: string | undefined;
}, {
    style: string;
    characterId: string;
    archetype: string;
    sheetImageUrl: string;
    poses: Record<string, {
        name: string;
        description: string;
        bbox: [number, number, number, number];
        previewUrl?: string | undefined;
        svgPath?: string | undefined;
    }>;
    customDescription?: string | undefined;
    createdAt?: string | undefined;
}>;
export type CharacterReferenceSheet = z.infer<typeof CharacterReferenceSheetSchema>;
export declare const WhiteboardStoryboardBeatSchema: z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
    narration: z.ZodString;
    duration: z.ZodNumber;
    assignedPose: z.ZodString;
    drawingPrompt: z.ZodString;
    drawingSvgPath: z.ZodOptional<z.ZodString>;
    markerColor: z.ZodOptional<z.ZodString>;
    handOverlay: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id: string;
    text: string;
    narration: string;
    duration: number;
    assignedPose: string;
    drawingPrompt: string;
    drawingSvgPath?: string | undefined;
    markerColor?: string | undefined;
    handOverlay?: boolean | undefined;
}, {
    id: string;
    text: string;
    narration: string;
    duration: number;
    assignedPose: string;
    drawingPrompt: string;
    drawingSvgPath?: string | undefined;
    markerColor?: string | undefined;
    handOverlay?: boolean | undefined;
}>;
export type WhiteboardStoryboardBeat = z.infer<typeof WhiteboardStoryboardBeatSchema>;
export declare const WhiteboardGenerationRequestSchema: z.ZodObject<{
    prompt: z.ZodString;
    script: z.ZodOptional<z.ZodString>;
    characterArchetype: z.ZodOptional<z.ZodEnum<["stickman", "saint", "old man", "founder", "doctor", "teacher", "scientist", "custom"]>>;
    customCharacterDescription: z.ZodOptional<z.ZodString>;
    style: z.ZodOptional<z.ZodEnum<["monoline_marker", "blackboard_chalk", "blueprint", "colored_doodle", "sketch_outline"]>>;
    markerColor: z.ZodOptional<z.ZodString>;
    aspectRatio: z.ZodOptional<z.ZodEnum<["16:9", "9:16", "1:1"]>>;
    voice: z.ZodOptional<z.ZodString>;
    mock: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    mock?: boolean | undefined;
    script?: string | undefined;
    voice?: string | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
    style?: "monoline_marker" | "blackboard_chalk" | "blueprint" | "colored_doodle" | "sketch_outline" | undefined;
    markerColor?: string | undefined;
    characterArchetype?: "stickman" | "saint" | "old man" | "founder" | "doctor" | "teacher" | "scientist" | "custom" | undefined;
    customCharacterDescription?: string | undefined;
}, {
    prompt: string;
    mock?: boolean | undefined;
    script?: string | undefined;
    voice?: string | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
    style?: "monoline_marker" | "blackboard_chalk" | "blueprint" | "colored_doodle" | "sketch_outline" | undefined;
    markerColor?: string | undefined;
    characterArchetype?: "stickman" | "saint" | "old man" | "founder" | "doctor" | "teacher" | "scientist" | "custom" | undefined;
    customCharacterDescription?: string | undefined;
}>;
export type WhiteboardGenerationRequest = z.infer<typeof WhiteboardGenerationRequestSchema>;
export declare const WhiteboardGenerationResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    jobId: z.ZodString;
    videoUrl: z.ZodString;
    characterSheet: z.ZodObject<{
        characterId: z.ZodString;
        archetype: z.ZodUnion<[z.ZodEnum<["stickman", "saint", "old man", "founder", "doctor", "teacher", "scientist", "custom"]>, z.ZodString]>;
        customDescription: z.ZodOptional<z.ZodString>;
        sheetImageUrl: z.ZodString;
        poses: z.ZodRecord<z.ZodString, z.ZodObject<{
            name: z.ZodString;
            description: z.ZodString;
            bbox: z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>;
            svgPath: z.ZodOptional<z.ZodString>;
            previewUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            description: string;
            bbox: [number, number, number, number];
            previewUrl?: string | undefined;
            svgPath?: string | undefined;
        }, {
            name: string;
            description: string;
            bbox: [number, number, number, number];
            previewUrl?: string | undefined;
            svgPath?: string | undefined;
        }>>;
        style: z.ZodUnion<[z.ZodEnum<["monoline_marker", "blackboard_chalk", "blueprint", "colored_doodle", "sketch_outline"]>, z.ZodString]>;
        createdAt: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        style: string;
        characterId: string;
        archetype: string;
        sheetImageUrl: string;
        poses: Record<string, {
            name: string;
            description: string;
            bbox: [number, number, number, number];
            previewUrl?: string | undefined;
            svgPath?: string | undefined;
        }>;
        customDescription?: string | undefined;
        createdAt?: string | undefined;
    }, {
        style: string;
        characterId: string;
        archetype: string;
        sheetImageUrl: string;
        poses: Record<string, {
            name: string;
            description: string;
            bbox: [number, number, number, number];
            previewUrl?: string | undefined;
            svgPath?: string | undefined;
        }>;
        customDescription?: string | undefined;
        createdAt?: string | undefined;
    }>;
    storyboard: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        text: z.ZodString;
        narration: z.ZodString;
        duration: z.ZodNumber;
        assignedPose: z.ZodString;
        drawingPrompt: z.ZodString;
        drawingSvgPath: z.ZodOptional<z.ZodString>;
        markerColor: z.ZodOptional<z.ZodString>;
        handOverlay: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        text: string;
        narration: string;
        duration: number;
        assignedPose: string;
        drawingPrompt: string;
        drawingSvgPath?: string | undefined;
        markerColor?: string | undefined;
        handOverlay?: boolean | undefined;
    }, {
        id: string;
        text: string;
        narration: string;
        duration: number;
        assignedPose: string;
        drawingPrompt: string;
        drawingSvgPath?: string | undefined;
        markerColor?: string | undefined;
        handOverlay?: boolean | undefined;
    }>, "many">;
    duration: z.ZodNumber;
    metadata: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    duration: number;
    videoUrl: string;
    success: boolean;
    jobId: string;
    metadata: Record<string, unknown>;
    characterSheet: {
        style: string;
        characterId: string;
        archetype: string;
        sheetImageUrl: string;
        poses: Record<string, {
            name: string;
            description: string;
            bbox: [number, number, number, number];
            previewUrl?: string | undefined;
            svgPath?: string | undefined;
        }>;
        customDescription?: string | undefined;
        createdAt?: string | undefined;
    };
    storyboard: {
        id: string;
        text: string;
        narration: string;
        duration: number;
        assignedPose: string;
        drawingPrompt: string;
        drawingSvgPath?: string | undefined;
        markerColor?: string | undefined;
        handOverlay?: boolean | undefined;
    }[];
    error?: string | undefined;
}, {
    duration: number;
    videoUrl: string;
    success: boolean;
    jobId: string;
    metadata: Record<string, unknown>;
    characterSheet: {
        style: string;
        characterId: string;
        archetype: string;
        sheetImageUrl: string;
        poses: Record<string, {
            name: string;
            description: string;
            bbox: [number, number, number, number];
            previewUrl?: string | undefined;
            svgPath?: string | undefined;
        }>;
        customDescription?: string | undefined;
        createdAt?: string | undefined;
    };
    storyboard: {
        id: string;
        text: string;
        narration: string;
        duration: number;
        assignedPose: string;
        drawingPrompt: string;
        drawingSvgPath?: string | undefined;
        markerColor?: string | undefined;
        handOverlay?: boolean | undefined;
    }[];
    error?: string | undefined;
}>;
export type WhiteboardGenerationResponse = z.infer<typeof WhiteboardGenerationResponseSchema>;
/**
 * Mission Types
 */
export declare const MissionStageSchema: z.ZodEnum<["prompt_analysis", "script_generation", "scene_planning", "asset_sourcing", "voice_synthesis", "video_composition", "ready"]>;
export declare const MissionStepStatusSchema: z.ZodObject<{
    stage: z.ZodEnum<["prompt_analysis", "script_generation", "scene_planning", "asset_sourcing", "voice_synthesis", "video_composition", "ready"]>;
    label: z.ZodString;
    status: z.ZodEnum<["pending", "in_progress", "completed", "failed"]>;
    progress: z.ZodNumber;
    startedAt: z.ZodOptional<z.ZodString>;
    completedAt: z.ZodOptional<z.ZodString>;
    log: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "completed" | "failed" | "in_progress";
    stage: "prompt_analysis" | "script_generation" | "scene_planning" | "asset_sourcing" | "voice_synthesis" | "video_composition" | "ready";
    label: string;
    progress: number;
    startedAt?: string | undefined;
    completedAt?: string | undefined;
    log?: string | undefined;
}, {
    status: "pending" | "completed" | "failed" | "in_progress";
    stage: "prompt_analysis" | "script_generation" | "scene_planning" | "asset_sourcing" | "voice_synthesis" | "video_composition" | "ready";
    label: string;
    progress: number;
    startedAt?: string | undefined;
    completedAt?: string | undefined;
    log?: string | undefined;
}>;
export type MissionStepStatus = z.infer<typeof MissionStepStatusSchema>;
export declare const MissionJobStateSchema: z.ZodObject<{
    jobId: z.ZodString;
    prompt: z.ZodString;
    aspectRatio: z.ZodEnum<["16:9", "9:16", "1:1"]>;
    style: z.ZodString;
    voice: z.ZodString;
    currentStage: z.ZodEnum<["prompt_analysis", "script_generation", "scene_planning", "asset_sourcing", "voice_synthesis", "video_composition", "ready"]>;
    overallProgress: z.ZodNumber;
    steps: z.ZodArray<z.ZodObject<{
        stage: z.ZodEnum<["prompt_analysis", "script_generation", "scene_planning", "asset_sourcing", "voice_synthesis", "video_composition", "ready"]>;
        label: z.ZodString;
        status: z.ZodEnum<["pending", "in_progress", "completed", "failed"]>;
        progress: z.ZodNumber;
        startedAt: z.ZodOptional<z.ZodString>;
        completedAt: z.ZodOptional<z.ZodString>;
        log: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "pending" | "completed" | "failed" | "in_progress";
        stage: "prompt_analysis" | "script_generation" | "scene_planning" | "asset_sourcing" | "voice_synthesis" | "video_composition" | "ready";
        label: string;
        progress: number;
        startedAt?: string | undefined;
        completedAt?: string | undefined;
        log?: string | undefined;
    }, {
        status: "pending" | "completed" | "failed" | "in_progress";
        stage: "prompt_analysis" | "script_generation" | "scene_planning" | "asset_sourcing" | "voice_synthesis" | "video_composition" | "ready";
        label: string;
        progress: number;
        startedAt?: string | undefined;
        completedAt?: string | undefined;
        log?: string | undefined;
    }>, "many">;
    script: z.ZodOptional<z.ZodString>;
    scenes: z.ZodOptional<z.ZodArray<z.ZodObject<{
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
            platform: z.ZodString;
            thumbnail: z.ZodOptional<z.ZodString>;
            duration: z.ZodOptional<z.ZodNumber>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            url: string;
            id: string;
            platform: string;
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
        }, {
            url: string;
            id: string;
            platform: string;
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
        }>>;
        imageUrl: z.ZodOptional<z.ZodString>;
        videoUrl: z.ZodOptional<z.ZodString>;
        audioUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        text: string;
        duration: number;
        description: string;
        keywords: string[];
        imageUrl?: string | undefined;
        videoUrl?: string | undefined;
        selectedVideo?: {
            url: string;
            id: string;
            platform: string;
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
        } | undefined;
        imagePrompt?: string | undefined;
        audioUrl?: string | undefined;
        emotion?: string | undefined;
        cameraMotion?: string | undefined;
        visualPrompt?: string | undefined;
    }, {
        id: string;
        text: string;
        duration: number;
        description: string;
        keywords: string[];
        imageUrl?: string | undefined;
        videoUrl?: string | undefined;
        selectedVideo?: {
            url: string;
            id: string;
            platform: string;
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
        } | undefined;
        imagePrompt?: string | undefined;
        audioUrl?: string | undefined;
        emotion?: string | undefined;
        cameraMotion?: string | undefined;
        visualPrompt?: string | undefined;
    }>, "many">>;
    audioUrl: z.ZodOptional<z.ZodString>;
    videoUrl: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    voice: string;
    aspectRatio: "16:9" | "9:16" | "1:1";
    jobId: string;
    style: string;
    currentStage: "prompt_analysis" | "script_generation" | "scene_planning" | "asset_sourcing" | "voice_synthesis" | "video_composition" | "ready";
    overallProgress: number;
    steps: {
        status: "pending" | "completed" | "failed" | "in_progress";
        stage: "prompt_analysis" | "script_generation" | "scene_planning" | "asset_sourcing" | "voice_synthesis" | "video_composition" | "ready";
        label: string;
        progress: number;
        startedAt?: string | undefined;
        completedAt?: string | undefined;
        log?: string | undefined;
    }[];
    script?: string | undefined;
    videoUrl?: string | undefined;
    scenes?: {
        id: string;
        text: string;
        duration: number;
        description: string;
        keywords: string[];
        imageUrl?: string | undefined;
        videoUrl?: string | undefined;
        selectedVideo?: {
            url: string;
            id: string;
            platform: string;
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
        } | undefined;
        imagePrompt?: string | undefined;
        audioUrl?: string | undefined;
        emotion?: string | undefined;
        cameraMotion?: string | undefined;
        visualPrompt?: string | undefined;
    }[] | undefined;
    error?: string | undefined;
    audioUrl?: string | undefined;
}, {
    prompt: string;
    voice: string;
    aspectRatio: "16:9" | "9:16" | "1:1";
    jobId: string;
    style: string;
    currentStage: "prompt_analysis" | "script_generation" | "scene_planning" | "asset_sourcing" | "voice_synthesis" | "video_composition" | "ready";
    overallProgress: number;
    steps: {
        status: "pending" | "completed" | "failed" | "in_progress";
        stage: "prompt_analysis" | "script_generation" | "scene_planning" | "asset_sourcing" | "voice_synthesis" | "video_composition" | "ready";
        label: string;
        progress: number;
        startedAt?: string | undefined;
        completedAt?: string | undefined;
        log?: string | undefined;
    }[];
    script?: string | undefined;
    videoUrl?: string | undefined;
    scenes?: {
        id: string;
        text: string;
        duration: number;
        description: string;
        keywords: string[];
        imageUrl?: string | undefined;
        videoUrl?: string | undefined;
        selectedVideo?: {
            url: string;
            id: string;
            platform: string;
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
        } | undefined;
        imagePrompt?: string | undefined;
        audioUrl?: string | undefined;
        emotion?: string | undefined;
        cameraMotion?: string | undefined;
        visualPrompt?: string | undefined;
    }[] | undefined;
    error?: string | undefined;
    audioUrl?: string | undefined;
}>;
export type MissionJobState = z.infer<typeof MissionJobStateSchema>;
/**
 * Validation helpers
 */
export declare function validateAIVideoRequest(data: unknown): {
    mock: boolean;
    script: string;
    prompt?: string | undefined;
    duration?: number | undefined;
    voice?: string | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
    model?: string | undefined;
    cameraMotion?: "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "orbit" | "drone" | "tilt_up" | "tilt_down" | undefined;
    style?: string | undefined;
    negativePrompt?: string | undefined;
    characterSheetUrl?: string | undefined;
    seed?: number | undefined;
};
export declare function validateStorySeriesRequest(data: unknown): {
    topic: string;
    storyType: string;
    partsCount: number;
    visualStyle: string;
    voice?: string | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
    includeHooks?: boolean | undefined;
};
export declare function validateBulkPlanRequest(data: unknown): {
    platforms: string[];
    visualStyle: string;
    niche: string;
    contentCount: number;
    cadence: string;
    voice?: string | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
};
export declare function validateDramaSeriesRequest(data: unknown): {
    genre: string;
    characters: {
        name: string;
        description: string;
        visualAnchor: string;
        voice?: string | undefined;
        avatarUrl?: string | undefined;
    }[];
    episodesCount: number;
    script?: string | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
    visualStyle?: string | undefined;
};
export declare function validateShortsExtractionRequest(data: unknown): {
    sourceType: "url" | "transcript" | "file";
    transcript?: string | undefined;
    videoUrl?: string | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
    clipCount?: number | undefined;
    strategy?: string | undefined;
    captionStyle?: string | undefined;
};
export declare function validateAutoPilotConfig(data: unknown): {
    niche: string;
    pipelineName: string;
    schedule: string;
    sourceStrategy: string;
    visualPipeline: string;
    autoPublish: boolean;
    targetPlatforms: string[];
    voice?: string | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
    visualStyle?: string | undefined;
};
export declare function validateAvatarConfig(data: unknown): {
    avatarType: "preset" | "custom_photo";
    voice?: string | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
    speed?: number | undefined;
    avatarId?: string | undefined;
    customImageUrl?: string | null | undefined;
    layout?: "pip_bottom_right" | "pip_bottom_left" | "fullscreen" | "side_by_side" | "circular_bubble" | undefined;
    backgroundVideoUrl?: string | undefined;
    backgroundMusicUrl?: string | undefined;
};
export declare function validateWhiteboardRequest(data: unknown): {
    prompt: string;
    mock?: boolean | undefined;
    script?: string | undefined;
    voice?: string | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
    style?: "monoline_marker" | "blackboard_chalk" | "blueprint" | "colored_doodle" | "sketch_outline" | undefined;
    markerColor?: string | undefined;
    characterArchetype?: "stickman" | "saint" | "old man" | "founder" | "doctor" | "teacher" | "scientist" | "custom" | undefined;
    customCharacterDescription?: string | undefined;
};
export declare function validateMissionJobState(data: unknown): {
    prompt: string;
    voice: string;
    aspectRatio: "16:9" | "9:16" | "1:1";
    jobId: string;
    style: string;
    currentStage: "prompt_analysis" | "script_generation" | "scene_planning" | "asset_sourcing" | "voice_synthesis" | "video_composition" | "ready";
    overallProgress: number;
    steps: {
        status: "pending" | "completed" | "failed" | "in_progress";
        stage: "prompt_analysis" | "script_generation" | "scene_planning" | "asset_sourcing" | "voice_synthesis" | "video_composition" | "ready";
        label: string;
        progress: number;
        startedAt?: string | undefined;
        completedAt?: string | undefined;
        log?: string | undefined;
    }[];
    script?: string | undefined;
    videoUrl?: string | undefined;
    scenes?: {
        id: string;
        text: string;
        duration: number;
        description: string;
        keywords: string[];
        imageUrl?: string | undefined;
        videoUrl?: string | undefined;
        selectedVideo?: {
            url: string;
            id: string;
            platform: string;
            title: string;
            duration?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            thumbnail?: string | undefined;
        } | undefined;
        imagePrompt?: string | undefined;
        audioUrl?: string | undefined;
        emotion?: string | undefined;
        cameraMotion?: string | undefined;
        visualPrompt?: string | undefined;
    }[] | undefined;
    error?: string | undefined;
    audioUrl?: string | undefined;
};
//# sourceMappingURL=workflow.d.ts.map