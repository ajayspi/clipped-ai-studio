import { z } from 'zod';
/**
 * Subtitle configuration for video rendering
 */
export declare const SubtitleConfigSchema: z.ZodObject<{
    burnSubtitles: z.ZodDefault<z.ZodBoolean>;
    subtitlePreset: z.ZodOptional<z.ZodString>;
    subtitleColor: z.ZodOptional<z.ZodString>;
    subtitleHighlightColor: z.ZodOptional<z.ZodString>;
    subtitleGlow: z.ZodOptional<z.ZodBoolean>;
    subtitleGlowColor: z.ZodOptional<z.ZodString>;
    subtitleOutline: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodString]>>;
    subtitleOutlineWidth: z.ZodOptional<z.ZodNumber>;
    subtitleBox: z.ZodOptional<z.ZodBoolean>;
    subtitleBoxColor: z.ZodOptional<z.ZodString>;
    subtitleSize: z.ZodOptional<z.ZodNumber>;
    subtitleY: z.ZodOptional<z.ZodNumber>;
    subtitleUppercase: z.ZodOptional<z.ZodBoolean>;
    karaoke: z.ZodDefault<z.ZodBoolean>;
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
}, "strip", z.ZodTypeAny, {
    burnSubtitles: boolean;
    karaoke: boolean;
    subtitlePreset?: string | undefined;
    subtitleColor?: string | undefined;
    subtitleHighlightColor?: string | undefined;
    subtitleGlow?: boolean | undefined;
    subtitleGlowColor?: string | undefined;
    subtitleOutline?: string | boolean | undefined;
    subtitleOutlineWidth?: number | undefined;
    subtitleBox?: boolean | undefined;
    subtitleBoxColor?: string | undefined;
    subtitleSize?: number | undefined;
    subtitleY?: number | undefined;
    subtitleUppercase?: boolean | undefined;
    wordTimestamps?: {
        word: string;
        start: number;
        end: number;
        confidence?: number | undefined;
    }[] | undefined;
}, {
    burnSubtitles?: boolean | undefined;
    subtitlePreset?: string | undefined;
    subtitleColor?: string | undefined;
    subtitleHighlightColor?: string | undefined;
    subtitleGlow?: boolean | undefined;
    subtitleGlowColor?: string | undefined;
    subtitleOutline?: string | boolean | undefined;
    subtitleOutlineWidth?: number | undefined;
    subtitleBox?: boolean | undefined;
    subtitleBoxColor?: string | undefined;
    subtitleSize?: number | undefined;
    subtitleY?: number | undefined;
    subtitleUppercase?: boolean | undefined;
    karaoke?: boolean | undefined;
    wordTimestamps?: {
        word: string;
        start: number;
        end: number;
        confidence?: number | undefined;
    }[] | undefined;
}>;
export type SubtitleConfig = z.infer<typeof SubtitleConfigSchema>;
/**
 * Individual beat/scene in a render job
 */
export declare const RenderBeatSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    text: z.ZodOptional<z.ZodString>;
    prompt: z.ZodOptional<z.ZodString>;
    script: z.ZodOptional<z.ZodString>;
    narration: z.ZodOptional<z.ZodString>;
    duration: z.ZodOptional<z.ZodNumber>;
    voice: z.ZodOptional<z.ZodString>;
    clipUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    imageUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    videoUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    url: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    urls: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    candidates: z.ZodOptional<z.ZodArray<z.ZodObject<{
        url: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        url?: string | undefined;
    }, {
        url?: string | undefined;
    }>, "many">>;
    selectedVideo: z.ZodOptional<z.ZodObject<{
        url: z.ZodOptional<z.ZodString>;
        platform: z.ZodOptional<z.ZodString>;
        previewUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        url?: string | undefined;
        platform?: string | undefined;
        previewUrl?: string | undefined;
    }, {
        url?: string | undefined;
        platform?: string | undefined;
        previewUrl?: string | undefined;
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
    url?: string | undefined;
    wordTimestamps?: {
        word: string;
        start: number;
        end: number;
        confidence?: number | undefined;
    }[] | undefined;
    id?: string | undefined;
    text?: string | undefined;
    prompt?: string | undefined;
    script?: string | undefined;
    narration?: string | undefined;
    duration?: number | undefined;
    voice?: string | undefined;
    clipUrl?: string | undefined;
    imageUrl?: string | undefined;
    videoUrl?: string | undefined;
    urls?: string[] | undefined;
    candidates?: {
        url?: string | undefined;
    }[] | undefined;
    selectedVideo?: {
        url?: string | undefined;
        platform?: string | undefined;
        previewUrl?: string | undefined;
    } | undefined;
    exactDuration?: number | undefined;
}, {
    url?: string | undefined;
    wordTimestamps?: {
        word: string;
        start: number;
        end: number;
        confidence?: number | undefined;
    }[] | undefined;
    id?: string | undefined;
    text?: string | undefined;
    prompt?: string | undefined;
    script?: string | undefined;
    narration?: string | undefined;
    duration?: number | undefined;
    voice?: string | undefined;
    clipUrl?: string | undefined;
    imageUrl?: string | undefined;
    videoUrl?: string | undefined;
    urls?: string[] | undefined;
    candidates?: {
        url?: string | undefined;
    }[] | undefined;
    selectedVideo?: {
        url?: string | undefined;
        platform?: string | undefined;
        previewUrl?: string | undefined;
    } | undefined;
    exactDuration?: number | undefined;
}>;
export type RenderBeat = z.infer<typeof RenderBeatSchema>;
/**
 * Scene representation (alternative to beats for some workflows)
 */
export declare const RenderSceneSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    text: z.ZodOptional<z.ZodString>;
    narration: z.ZodOptional<z.ZodString>;
    prompt: z.ZodOptional<z.ZodString>;
    script: z.ZodOptional<z.ZodString>;
    duration: z.ZodOptional<z.ZodNumber>;
    clipUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    videoUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    url: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    selectedVideo: z.ZodOptional<z.ZodObject<{
        url: z.ZodOptional<z.ZodString>;
        previewUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        url?: string | undefined;
        previewUrl?: string | undefined;
    }, {
        url?: string | undefined;
        previewUrl?: string | undefined;
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
    url?: string | undefined;
    wordTimestamps?: {
        word: string;
        start: number;
        end: number;
        confidence?: number | undefined;
    }[] | undefined;
    id?: string | undefined;
    text?: string | undefined;
    prompt?: string | undefined;
    script?: string | undefined;
    narration?: string | undefined;
    duration?: number | undefined;
    clipUrl?: string | undefined;
    videoUrl?: string | undefined;
    selectedVideo?: {
        url?: string | undefined;
        previewUrl?: string | undefined;
    } | undefined;
    exactDuration?: number | undefined;
}, {
    url?: string | undefined;
    wordTimestamps?: {
        word: string;
        start: number;
        end: number;
        confidence?: number | undefined;
    }[] | undefined;
    id?: string | undefined;
    text?: string | undefined;
    prompt?: string | undefined;
    script?: string | undefined;
    narration?: string | undefined;
    duration?: number | undefined;
    clipUrl?: string | undefined;
    videoUrl?: string | undefined;
    selectedVideo?: {
        url?: string | undefined;
        previewUrl?: string | undefined;
    } | undefined;
    exactDuration?: number | undefined;
}>;
export type RenderScene = z.infer<typeof RenderSceneSchema>;
/**
 * Main render job parameters passed via job.logs
 */
export declare const RenderParamsSchema: z.ZodObject<{
    message: z.ZodOptional<z.ZodString>;
    script: z.ZodOptional<z.ZodString>;
    duration: z.ZodOptional<z.ZodNumber>;
    aspectRatio: z.ZodOptional<z.ZodEnum<["16:9", "9:16", "1:1"]>>;
    voice: z.ZodOptional<z.ZodString>;
    voiceProvider: z.ZodOptional<z.ZodString>;
    voiceSpeed: z.ZodDefault<z.ZodNumber>;
    voiceVolume: z.ZodDefault<z.ZodNumber>;
    musicVolume: z.ZodOptional<z.ZodString>;
    musicSource: z.ZodOptional<z.ZodString>;
    beats: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodString>;
        prompt: z.ZodOptional<z.ZodString>;
        script: z.ZodOptional<z.ZodString>;
        narration: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodNumber>;
        voice: z.ZodOptional<z.ZodString>;
        clipUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        imageUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        videoUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        url: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        urls: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        candidates: z.ZodOptional<z.ZodArray<z.ZodObject<{
            url: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            url?: string | undefined;
        }, {
            url?: string | undefined;
        }>, "many">>;
        selectedVideo: z.ZodOptional<z.ZodObject<{
            url: z.ZodOptional<z.ZodString>;
            platform: z.ZodOptional<z.ZodString>;
            previewUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            url?: string | undefined;
            platform?: string | undefined;
            previewUrl?: string | undefined;
        }, {
            url?: string | undefined;
            platform?: string | undefined;
            previewUrl?: string | undefined;
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
        url?: string | undefined;
        wordTimestamps?: {
            word: string;
            start: number;
            end: number;
            confidence?: number | undefined;
        }[] | undefined;
        id?: string | undefined;
        text?: string | undefined;
        prompt?: string | undefined;
        script?: string | undefined;
        narration?: string | undefined;
        duration?: number | undefined;
        voice?: string | undefined;
        clipUrl?: string | undefined;
        imageUrl?: string | undefined;
        videoUrl?: string | undefined;
        urls?: string[] | undefined;
        candidates?: {
            url?: string | undefined;
        }[] | undefined;
        selectedVideo?: {
            url?: string | undefined;
            platform?: string | undefined;
            previewUrl?: string | undefined;
        } | undefined;
        exactDuration?: number | undefined;
    }, {
        url?: string | undefined;
        wordTimestamps?: {
            word: string;
            start: number;
            end: number;
            confidence?: number | undefined;
        }[] | undefined;
        id?: string | undefined;
        text?: string | undefined;
        prompt?: string | undefined;
        script?: string | undefined;
        narration?: string | undefined;
        duration?: number | undefined;
        voice?: string | undefined;
        clipUrl?: string | undefined;
        imageUrl?: string | undefined;
        videoUrl?: string | undefined;
        urls?: string[] | undefined;
        candidates?: {
            url?: string | undefined;
        }[] | undefined;
        selectedVideo?: {
            url?: string | undefined;
            platform?: string | undefined;
            previewUrl?: string | undefined;
        } | undefined;
        exactDuration?: number | undefined;
    }>, "many">>;
    input: z.ZodOptional<z.ZodObject<{
        script: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodNumber>;
        beats: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            text: z.ZodOptional<z.ZodString>;
            prompt: z.ZodOptional<z.ZodString>;
            script: z.ZodOptional<z.ZodString>;
            narration: z.ZodOptional<z.ZodString>;
            duration: z.ZodOptional<z.ZodNumber>;
            voice: z.ZodOptional<z.ZodString>;
            clipUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
            imageUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
            videoUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
            url: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
            urls: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            candidates: z.ZodOptional<z.ZodArray<z.ZodObject<{
                url: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                url?: string | undefined;
            }, {
                url?: string | undefined;
            }>, "many">>;
            selectedVideo: z.ZodOptional<z.ZodObject<{
                url: z.ZodOptional<z.ZodString>;
                platform: z.ZodOptional<z.ZodString>;
                previewUrl: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                url?: string | undefined;
                platform?: string | undefined;
                previewUrl?: string | undefined;
            }, {
                url?: string | undefined;
                platform?: string | undefined;
                previewUrl?: string | undefined;
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
            url?: string | undefined;
            wordTimestamps?: {
                word: string;
                start: number;
                end: number;
                confidence?: number | undefined;
            }[] | undefined;
            id?: string | undefined;
            text?: string | undefined;
            prompt?: string | undefined;
            script?: string | undefined;
            narration?: string | undefined;
            duration?: number | undefined;
            voice?: string | undefined;
            clipUrl?: string | undefined;
            imageUrl?: string | undefined;
            videoUrl?: string | undefined;
            urls?: string[] | undefined;
            candidates?: {
                url?: string | undefined;
            }[] | undefined;
            selectedVideo?: {
                url?: string | undefined;
                platform?: string | undefined;
                previewUrl?: string | undefined;
            } | undefined;
            exactDuration?: number | undefined;
        }, {
            url?: string | undefined;
            wordTimestamps?: {
                word: string;
                start: number;
                end: number;
                confidence?: number | undefined;
            }[] | undefined;
            id?: string | undefined;
            text?: string | undefined;
            prompt?: string | undefined;
            script?: string | undefined;
            narration?: string | undefined;
            duration?: number | undefined;
            voice?: string | undefined;
            clipUrl?: string | undefined;
            imageUrl?: string | undefined;
            videoUrl?: string | undefined;
            urls?: string[] | undefined;
            candidates?: {
                url?: string | undefined;
            }[] | undefined;
            selectedVideo?: {
                url?: string | undefined;
                platform?: string | undefined;
                previewUrl?: string | undefined;
            } | undefined;
            exactDuration?: number | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        script?: string | undefined;
        duration?: number | undefined;
        beats?: {
            url?: string | undefined;
            wordTimestamps?: {
                word: string;
                start: number;
                end: number;
                confidence?: number | undefined;
            }[] | undefined;
            id?: string | undefined;
            text?: string | undefined;
            prompt?: string | undefined;
            script?: string | undefined;
            narration?: string | undefined;
            duration?: number | undefined;
            voice?: string | undefined;
            clipUrl?: string | undefined;
            imageUrl?: string | undefined;
            videoUrl?: string | undefined;
            urls?: string[] | undefined;
            candidates?: {
                url?: string | undefined;
            }[] | undefined;
            selectedVideo?: {
                url?: string | undefined;
                platform?: string | undefined;
                previewUrl?: string | undefined;
            } | undefined;
            exactDuration?: number | undefined;
        }[] | undefined;
    }, {
        script?: string | undefined;
        duration?: number | undefined;
        beats?: {
            url?: string | undefined;
            wordTimestamps?: {
                word: string;
                start: number;
                end: number;
                confidence?: number | undefined;
            }[] | undefined;
            id?: string | undefined;
            text?: string | undefined;
            prompt?: string | undefined;
            script?: string | undefined;
            narration?: string | undefined;
            duration?: number | undefined;
            voice?: string | undefined;
            clipUrl?: string | undefined;
            imageUrl?: string | undefined;
            videoUrl?: string | undefined;
            urls?: string[] | undefined;
            candidates?: {
                url?: string | undefined;
            }[] | undefined;
            selectedVideo?: {
                url?: string | undefined;
                platform?: string | undefined;
                previewUrl?: string | undefined;
            } | undefined;
            exactDuration?: number | undefined;
        }[] | undefined;
    }>>;
    analysis: z.ZodOptional<z.ZodObject<{
        scenes: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            text: z.ZodOptional<z.ZodString>;
            narration: z.ZodOptional<z.ZodString>;
            prompt: z.ZodOptional<z.ZodString>;
            script: z.ZodOptional<z.ZodString>;
            duration: z.ZodOptional<z.ZodNumber>;
            clipUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
            videoUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
            url: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
            selectedVideo: z.ZodOptional<z.ZodObject<{
                url: z.ZodOptional<z.ZodString>;
                previewUrl: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                url?: string | undefined;
                previewUrl?: string | undefined;
            }, {
                url?: string | undefined;
                previewUrl?: string | undefined;
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
            url?: string | undefined;
            wordTimestamps?: {
                word: string;
                start: number;
                end: number;
                confidence?: number | undefined;
            }[] | undefined;
            id?: string | undefined;
            text?: string | undefined;
            prompt?: string | undefined;
            script?: string | undefined;
            narration?: string | undefined;
            duration?: number | undefined;
            clipUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url?: string | undefined;
                previewUrl?: string | undefined;
            } | undefined;
            exactDuration?: number | undefined;
        }, {
            url?: string | undefined;
            wordTimestamps?: {
                word: string;
                start: number;
                end: number;
                confidence?: number | undefined;
            }[] | undefined;
            id?: string | undefined;
            text?: string | undefined;
            prompt?: string | undefined;
            script?: string | undefined;
            narration?: string | undefined;
            duration?: number | undefined;
            clipUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url?: string | undefined;
                previewUrl?: string | undefined;
            } | undefined;
            exactDuration?: number | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        scenes?: {
            url?: string | undefined;
            wordTimestamps?: {
                word: string;
                start: number;
                end: number;
                confidence?: number | undefined;
            }[] | undefined;
            id?: string | undefined;
            text?: string | undefined;
            prompt?: string | undefined;
            script?: string | undefined;
            narration?: string | undefined;
            duration?: number | undefined;
            clipUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url?: string | undefined;
                previewUrl?: string | undefined;
            } | undefined;
            exactDuration?: number | undefined;
        }[] | undefined;
    }, {
        scenes?: {
            url?: string | undefined;
            wordTimestamps?: {
                word: string;
                start: number;
                end: number;
                confidence?: number | undefined;
            }[] | undefined;
            id?: string | undefined;
            text?: string | undefined;
            prompt?: string | undefined;
            script?: string | undefined;
            narration?: string | undefined;
            duration?: number | undefined;
            clipUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url?: string | undefined;
                previewUrl?: string | undefined;
            } | undefined;
            exactDuration?: number | undefined;
        }[] | undefined;
    }>>;
    result: z.ZodOptional<z.ZodObject<{
        scenes: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            text: z.ZodOptional<z.ZodString>;
            narration: z.ZodOptional<z.ZodString>;
            prompt: z.ZodOptional<z.ZodString>;
            script: z.ZodOptional<z.ZodString>;
            duration: z.ZodOptional<z.ZodNumber>;
            clipUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
            videoUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
            url: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
            selectedVideo: z.ZodOptional<z.ZodObject<{
                url: z.ZodOptional<z.ZodString>;
                previewUrl: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                url?: string | undefined;
                previewUrl?: string | undefined;
            }, {
                url?: string | undefined;
                previewUrl?: string | undefined;
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
            url?: string | undefined;
            wordTimestamps?: {
                word: string;
                start: number;
                end: number;
                confidence?: number | undefined;
            }[] | undefined;
            id?: string | undefined;
            text?: string | undefined;
            prompt?: string | undefined;
            script?: string | undefined;
            narration?: string | undefined;
            duration?: number | undefined;
            clipUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url?: string | undefined;
                previewUrl?: string | undefined;
            } | undefined;
            exactDuration?: number | undefined;
        }, {
            url?: string | undefined;
            wordTimestamps?: {
                word: string;
                start: number;
                end: number;
                confidence?: number | undefined;
            }[] | undefined;
            id?: string | undefined;
            text?: string | undefined;
            prompt?: string | undefined;
            script?: string | undefined;
            narration?: string | undefined;
            duration?: number | undefined;
            clipUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url?: string | undefined;
                previewUrl?: string | undefined;
            } | undefined;
            exactDuration?: number | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        scenes?: {
            url?: string | undefined;
            wordTimestamps?: {
                word: string;
                start: number;
                end: number;
                confidence?: number | undefined;
            }[] | undefined;
            id?: string | undefined;
            text?: string | undefined;
            prompt?: string | undefined;
            script?: string | undefined;
            narration?: string | undefined;
            duration?: number | undefined;
            clipUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url?: string | undefined;
                previewUrl?: string | undefined;
            } | undefined;
            exactDuration?: number | undefined;
        }[] | undefined;
    }, {
        scenes?: {
            url?: string | undefined;
            wordTimestamps?: {
                word: string;
                start: number;
                end: number;
                confidence?: number | undefined;
            }[] | undefined;
            id?: string | undefined;
            text?: string | undefined;
            prompt?: string | undefined;
            script?: string | undefined;
            narration?: string | undefined;
            duration?: number | undefined;
            clipUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url?: string | undefined;
                previewUrl?: string | undefined;
            } | undefined;
            exactDuration?: number | undefined;
        }[] | undefined;
    }>>;
    scenes: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodString>;
        narration: z.ZodOptional<z.ZodString>;
        prompt: z.ZodOptional<z.ZodString>;
        script: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodNumber>;
        clipUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        videoUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        url: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        selectedVideo: z.ZodOptional<z.ZodObject<{
            url: z.ZodOptional<z.ZodString>;
            previewUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            url?: string | undefined;
            previewUrl?: string | undefined;
        }, {
            url?: string | undefined;
            previewUrl?: string | undefined;
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
        url?: string | undefined;
        wordTimestamps?: {
            word: string;
            start: number;
            end: number;
            confidence?: number | undefined;
        }[] | undefined;
        id?: string | undefined;
        text?: string | undefined;
        prompt?: string | undefined;
        script?: string | undefined;
        narration?: string | undefined;
        duration?: number | undefined;
        clipUrl?: string | undefined;
        videoUrl?: string | undefined;
        selectedVideo?: {
            url?: string | undefined;
            previewUrl?: string | undefined;
        } | undefined;
        exactDuration?: number | undefined;
    }, {
        url?: string | undefined;
        wordTimestamps?: {
            word: string;
            start: number;
            end: number;
            confidence?: number | undefined;
        }[] | undefined;
        id?: string | undefined;
        text?: string | undefined;
        prompt?: string | undefined;
        script?: string | undefined;
        narration?: string | undefined;
        duration?: number | undefined;
        clipUrl?: string | undefined;
        videoUrl?: string | undefined;
        selectedVideo?: {
            url?: string | undefined;
            previewUrl?: string | undefined;
        } | undefined;
        exactDuration?: number | undefined;
    }>, "many">>;
    subtitleSettings: z.ZodOptional<z.ZodObject<{
        burnSubtitles: z.ZodDefault<z.ZodBoolean>;
        subtitlePreset: z.ZodOptional<z.ZodString>;
        subtitleColor: z.ZodOptional<z.ZodString>;
        subtitleHighlightColor: z.ZodOptional<z.ZodString>;
        subtitleGlow: z.ZodOptional<z.ZodBoolean>;
        subtitleGlowColor: z.ZodOptional<z.ZodString>;
        subtitleOutline: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodString]>>;
        subtitleOutlineWidth: z.ZodOptional<z.ZodNumber>;
        subtitleBox: z.ZodOptional<z.ZodBoolean>;
        subtitleBoxColor: z.ZodOptional<z.ZodString>;
        subtitleSize: z.ZodOptional<z.ZodNumber>;
        subtitleY: z.ZodOptional<z.ZodNumber>;
        subtitleUppercase: z.ZodOptional<z.ZodBoolean>;
        karaoke: z.ZodDefault<z.ZodBoolean>;
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
    }, "strip", z.ZodTypeAny, {
        burnSubtitles: boolean;
        karaoke: boolean;
        subtitlePreset?: string | undefined;
        subtitleColor?: string | undefined;
        subtitleHighlightColor?: string | undefined;
        subtitleGlow?: boolean | undefined;
        subtitleGlowColor?: string | undefined;
        subtitleOutline?: string | boolean | undefined;
        subtitleOutlineWidth?: number | undefined;
        subtitleBox?: boolean | undefined;
        subtitleBoxColor?: string | undefined;
        subtitleSize?: number | undefined;
        subtitleY?: number | undefined;
        subtitleUppercase?: boolean | undefined;
        wordTimestamps?: {
            word: string;
            start: number;
            end: number;
            confidence?: number | undefined;
        }[] | undefined;
    }, {
        burnSubtitles?: boolean | undefined;
        subtitlePreset?: string | undefined;
        subtitleColor?: string | undefined;
        subtitleHighlightColor?: string | undefined;
        subtitleGlow?: boolean | undefined;
        subtitleGlowColor?: string | undefined;
        subtitleOutline?: string | boolean | undefined;
        subtitleOutlineWidth?: number | undefined;
        subtitleBox?: boolean | undefined;
        subtitleBoxColor?: string | undefined;
        subtitleSize?: number | undefined;
        subtitleY?: number | undefined;
        subtitleUppercase?: boolean | undefined;
        karaoke?: boolean | undefined;
        wordTimestamps?: {
            word: string;
            start: number;
            end: number;
            confidence?: number | undefined;
        }[] | undefined;
    }>>;
    burnSubtitles: z.ZodOptional<z.ZodBoolean>;
    subtitlePreset: z.ZodOptional<z.ZodString>;
    subtitleColor: z.ZodOptional<z.ZodString>;
    subtitleHighlightColor: z.ZodOptional<z.ZodString>;
    subtitleGlow: z.ZodOptional<z.ZodBoolean>;
    subtitleGlowColor: z.ZodOptional<z.ZodString>;
    subtitleOutline: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodString]>>;
    subtitleOutlineWidth: z.ZodOptional<z.ZodNumber>;
    subtitleBox: z.ZodOptional<z.ZodBoolean>;
    subtitleBoxColor: z.ZodOptional<z.ZodString>;
    subtitleSize: z.ZodOptional<z.ZodNumber>;
    subtitleY: z.ZodOptional<z.ZodNumber>;
    workflowType: z.ZodOptional<z.ZodEnum<["footage", "images", "ai-videos", "stories", "bulk", "bulk-plan", "shorts", "extract-shorts", "drama", "micro-drama", "auto", "avatar", "whiteboard", "mission"]>>;
    costEstimation: z.ZodOptional<z.ZodObject<{
        totalCostUsd: z.ZodOptional<z.ZodNumber>;
        llmTokens: z.ZodOptional<z.ZodNumber>;
        ttsCharacters: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        totalCostUsd?: number | undefined;
        llmTokens?: number | undefined;
        ttsCharacters?: number | undefined;
    }, {
        totalCostUsd?: number | undefined;
        llmTokens?: number | undefined;
        ttsCharacters?: number | undefined;
    }>>;
    finalVideoUrl: z.ZodOptional<z.ZodString>;
    bgmPreset: z.ZodOptional<z.ZodEnum<["upbeat", "cinematic", "ambient", "lofi", "dramatic", "corporate"]>>;
    bgmVolume: z.ZodDefault<z.ZodNumber>;
    enableDucking: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    voiceSpeed: number;
    voiceVolume: number;
    bgmVolume: number;
    enableDucking: boolean;
    message?: string | undefined;
    burnSubtitles?: boolean | undefined;
    subtitlePreset?: string | undefined;
    subtitleColor?: string | undefined;
    subtitleHighlightColor?: string | undefined;
    subtitleGlow?: boolean | undefined;
    subtitleGlowColor?: string | undefined;
    subtitleOutline?: string | boolean | undefined;
    subtitleOutlineWidth?: number | undefined;
    subtitleBox?: boolean | undefined;
    subtitleBoxColor?: string | undefined;
    subtitleSize?: number | undefined;
    subtitleY?: number | undefined;
    script?: string | undefined;
    duration?: number | undefined;
    voice?: string | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
    voiceProvider?: string | undefined;
    musicVolume?: string | undefined;
    musicSource?: string | undefined;
    beats?: {
        url?: string | undefined;
        wordTimestamps?: {
            word: string;
            start: number;
            end: number;
            confidence?: number | undefined;
        }[] | undefined;
        id?: string | undefined;
        text?: string | undefined;
        prompt?: string | undefined;
        script?: string | undefined;
        narration?: string | undefined;
        duration?: number | undefined;
        voice?: string | undefined;
        clipUrl?: string | undefined;
        imageUrl?: string | undefined;
        videoUrl?: string | undefined;
        urls?: string[] | undefined;
        candidates?: {
            url?: string | undefined;
        }[] | undefined;
        selectedVideo?: {
            url?: string | undefined;
            platform?: string | undefined;
            previewUrl?: string | undefined;
        } | undefined;
        exactDuration?: number | undefined;
    }[] | undefined;
    input?: {
        script?: string | undefined;
        duration?: number | undefined;
        beats?: {
            url?: string | undefined;
            wordTimestamps?: {
                word: string;
                start: number;
                end: number;
                confidence?: number | undefined;
            }[] | undefined;
            id?: string | undefined;
            text?: string | undefined;
            prompt?: string | undefined;
            script?: string | undefined;
            narration?: string | undefined;
            duration?: number | undefined;
            voice?: string | undefined;
            clipUrl?: string | undefined;
            imageUrl?: string | undefined;
            videoUrl?: string | undefined;
            urls?: string[] | undefined;
            candidates?: {
                url?: string | undefined;
            }[] | undefined;
            selectedVideo?: {
                url?: string | undefined;
                platform?: string | undefined;
                previewUrl?: string | undefined;
            } | undefined;
            exactDuration?: number | undefined;
        }[] | undefined;
    } | undefined;
    scenes?: {
        url?: string | undefined;
        wordTimestamps?: {
            word: string;
            start: number;
            end: number;
            confidence?: number | undefined;
        }[] | undefined;
        id?: string | undefined;
        text?: string | undefined;
        prompt?: string | undefined;
        script?: string | undefined;
        narration?: string | undefined;
        duration?: number | undefined;
        clipUrl?: string | undefined;
        videoUrl?: string | undefined;
        selectedVideo?: {
            url?: string | undefined;
            previewUrl?: string | undefined;
        } | undefined;
        exactDuration?: number | undefined;
    }[] | undefined;
    analysis?: {
        scenes?: {
            url?: string | undefined;
            wordTimestamps?: {
                word: string;
                start: number;
                end: number;
                confidence?: number | undefined;
            }[] | undefined;
            id?: string | undefined;
            text?: string | undefined;
            prompt?: string | undefined;
            script?: string | undefined;
            narration?: string | undefined;
            duration?: number | undefined;
            clipUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url?: string | undefined;
                previewUrl?: string | undefined;
            } | undefined;
            exactDuration?: number | undefined;
        }[] | undefined;
    } | undefined;
    result?: {
        scenes?: {
            url?: string | undefined;
            wordTimestamps?: {
                word: string;
                start: number;
                end: number;
                confidence?: number | undefined;
            }[] | undefined;
            id?: string | undefined;
            text?: string | undefined;
            prompt?: string | undefined;
            script?: string | undefined;
            narration?: string | undefined;
            duration?: number | undefined;
            clipUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url?: string | undefined;
                previewUrl?: string | undefined;
            } | undefined;
            exactDuration?: number | undefined;
        }[] | undefined;
    } | undefined;
    subtitleSettings?: {
        burnSubtitles: boolean;
        karaoke: boolean;
        subtitlePreset?: string | undefined;
        subtitleColor?: string | undefined;
        subtitleHighlightColor?: string | undefined;
        subtitleGlow?: boolean | undefined;
        subtitleGlowColor?: string | undefined;
        subtitleOutline?: string | boolean | undefined;
        subtitleOutlineWidth?: number | undefined;
        subtitleBox?: boolean | undefined;
        subtitleBoxColor?: string | undefined;
        subtitleSize?: number | undefined;
        subtitleY?: number | undefined;
        subtitleUppercase?: boolean | undefined;
        wordTimestamps?: {
            word: string;
            start: number;
            end: number;
            confidence?: number | undefined;
        }[] | undefined;
    } | undefined;
    workflowType?: "footage" | "images" | "ai-videos" | "stories" | "bulk" | "bulk-plan" | "shorts" | "extract-shorts" | "drama" | "micro-drama" | "auto" | "avatar" | "whiteboard" | "mission" | undefined;
    costEstimation?: {
        totalCostUsd?: number | undefined;
        llmTokens?: number | undefined;
        ttsCharacters?: number | undefined;
    } | undefined;
    finalVideoUrl?: string | undefined;
    bgmPreset?: "upbeat" | "cinematic" | "ambient" | "lofi" | "dramatic" | "corporate" | undefined;
}, {
    message?: string | undefined;
    burnSubtitles?: boolean | undefined;
    subtitlePreset?: string | undefined;
    subtitleColor?: string | undefined;
    subtitleHighlightColor?: string | undefined;
    subtitleGlow?: boolean | undefined;
    subtitleGlowColor?: string | undefined;
    subtitleOutline?: string | boolean | undefined;
    subtitleOutlineWidth?: number | undefined;
    subtitleBox?: boolean | undefined;
    subtitleBoxColor?: string | undefined;
    subtitleSize?: number | undefined;
    subtitleY?: number | undefined;
    script?: string | undefined;
    duration?: number | undefined;
    voice?: string | undefined;
    aspectRatio?: "16:9" | "9:16" | "1:1" | undefined;
    voiceProvider?: string | undefined;
    voiceSpeed?: number | undefined;
    voiceVolume?: number | undefined;
    musicVolume?: string | undefined;
    musicSource?: string | undefined;
    beats?: {
        url?: string | undefined;
        wordTimestamps?: {
            word: string;
            start: number;
            end: number;
            confidence?: number | undefined;
        }[] | undefined;
        id?: string | undefined;
        text?: string | undefined;
        prompt?: string | undefined;
        script?: string | undefined;
        narration?: string | undefined;
        duration?: number | undefined;
        voice?: string | undefined;
        clipUrl?: string | undefined;
        imageUrl?: string | undefined;
        videoUrl?: string | undefined;
        urls?: string[] | undefined;
        candidates?: {
            url?: string | undefined;
        }[] | undefined;
        selectedVideo?: {
            url?: string | undefined;
            platform?: string | undefined;
            previewUrl?: string | undefined;
        } | undefined;
        exactDuration?: number | undefined;
    }[] | undefined;
    input?: {
        script?: string | undefined;
        duration?: number | undefined;
        beats?: {
            url?: string | undefined;
            wordTimestamps?: {
                word: string;
                start: number;
                end: number;
                confidence?: number | undefined;
            }[] | undefined;
            id?: string | undefined;
            text?: string | undefined;
            prompt?: string | undefined;
            script?: string | undefined;
            narration?: string | undefined;
            duration?: number | undefined;
            voice?: string | undefined;
            clipUrl?: string | undefined;
            imageUrl?: string | undefined;
            videoUrl?: string | undefined;
            urls?: string[] | undefined;
            candidates?: {
                url?: string | undefined;
            }[] | undefined;
            selectedVideo?: {
                url?: string | undefined;
                platform?: string | undefined;
                previewUrl?: string | undefined;
            } | undefined;
            exactDuration?: number | undefined;
        }[] | undefined;
    } | undefined;
    scenes?: {
        url?: string | undefined;
        wordTimestamps?: {
            word: string;
            start: number;
            end: number;
            confidence?: number | undefined;
        }[] | undefined;
        id?: string | undefined;
        text?: string | undefined;
        prompt?: string | undefined;
        script?: string | undefined;
        narration?: string | undefined;
        duration?: number | undefined;
        clipUrl?: string | undefined;
        videoUrl?: string | undefined;
        selectedVideo?: {
            url?: string | undefined;
            previewUrl?: string | undefined;
        } | undefined;
        exactDuration?: number | undefined;
    }[] | undefined;
    analysis?: {
        scenes?: {
            url?: string | undefined;
            wordTimestamps?: {
                word: string;
                start: number;
                end: number;
                confidence?: number | undefined;
            }[] | undefined;
            id?: string | undefined;
            text?: string | undefined;
            prompt?: string | undefined;
            script?: string | undefined;
            narration?: string | undefined;
            duration?: number | undefined;
            clipUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url?: string | undefined;
                previewUrl?: string | undefined;
            } | undefined;
            exactDuration?: number | undefined;
        }[] | undefined;
    } | undefined;
    result?: {
        scenes?: {
            url?: string | undefined;
            wordTimestamps?: {
                word: string;
                start: number;
                end: number;
                confidence?: number | undefined;
            }[] | undefined;
            id?: string | undefined;
            text?: string | undefined;
            prompt?: string | undefined;
            script?: string | undefined;
            narration?: string | undefined;
            duration?: number | undefined;
            clipUrl?: string | undefined;
            videoUrl?: string | undefined;
            selectedVideo?: {
                url?: string | undefined;
                previewUrl?: string | undefined;
            } | undefined;
            exactDuration?: number | undefined;
        }[] | undefined;
    } | undefined;
    subtitleSettings?: {
        burnSubtitles?: boolean | undefined;
        subtitlePreset?: string | undefined;
        subtitleColor?: string | undefined;
        subtitleHighlightColor?: string | undefined;
        subtitleGlow?: boolean | undefined;
        subtitleGlowColor?: string | undefined;
        subtitleOutline?: string | boolean | undefined;
        subtitleOutlineWidth?: number | undefined;
        subtitleBox?: boolean | undefined;
        subtitleBoxColor?: string | undefined;
        subtitleSize?: number | undefined;
        subtitleY?: number | undefined;
        subtitleUppercase?: boolean | undefined;
        karaoke?: boolean | undefined;
        wordTimestamps?: {
            word: string;
            start: number;
            end: number;
            confidence?: number | undefined;
        }[] | undefined;
    } | undefined;
    workflowType?: "footage" | "images" | "ai-videos" | "stories" | "bulk" | "bulk-plan" | "shorts" | "extract-shorts" | "drama" | "micro-drama" | "auto" | "avatar" | "whiteboard" | "mission" | undefined;
    costEstimation?: {
        totalCostUsd?: number | undefined;
        llmTokens?: number | undefined;
        ttsCharacters?: number | undefined;
    } | undefined;
    finalVideoUrl?: string | undefined;
    bgmPreset?: "upbeat" | "cinematic" | "ambient" | "lofi" | "dramatic" | "corporate" | undefined;
    bgmVolume?: number | undefined;
    enableDucking?: boolean | undefined;
}>;
export type RenderParams = z.infer<typeof RenderParamsSchema>;
/**
 * Orchestration state stored in job.orchestration_state
 */
export declare const RenderOrchestrationStateSchema: z.ZodObject<{
    subtitleSettings: z.ZodOptional<z.ZodObject<{
        burnSubtitles: z.ZodDefault<z.ZodBoolean>;
        subtitlePreset: z.ZodOptional<z.ZodString>;
        subtitleColor: z.ZodOptional<z.ZodString>;
        subtitleHighlightColor: z.ZodOptional<z.ZodString>;
        subtitleGlow: z.ZodOptional<z.ZodBoolean>;
        subtitleGlowColor: z.ZodOptional<z.ZodString>;
        subtitleOutline: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodString]>>;
        subtitleOutlineWidth: z.ZodOptional<z.ZodNumber>;
        subtitleBox: z.ZodOptional<z.ZodBoolean>;
        subtitleBoxColor: z.ZodOptional<z.ZodString>;
        subtitleSize: z.ZodOptional<z.ZodNumber>;
        subtitleY: z.ZodOptional<z.ZodNumber>;
        subtitleUppercase: z.ZodOptional<z.ZodBoolean>;
        karaoke: z.ZodDefault<z.ZodBoolean>;
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
    }, "strip", z.ZodTypeAny, {
        burnSubtitles: boolean;
        karaoke: boolean;
        subtitlePreset?: string | undefined;
        subtitleColor?: string | undefined;
        subtitleHighlightColor?: string | undefined;
        subtitleGlow?: boolean | undefined;
        subtitleGlowColor?: string | undefined;
        subtitleOutline?: string | boolean | undefined;
        subtitleOutlineWidth?: number | undefined;
        subtitleBox?: boolean | undefined;
        subtitleBoxColor?: string | undefined;
        subtitleSize?: number | undefined;
        subtitleY?: number | undefined;
        subtitleUppercase?: boolean | undefined;
        wordTimestamps?: {
            word: string;
            start: number;
            end: number;
            confidence?: number | undefined;
        }[] | undefined;
    }, {
        burnSubtitles?: boolean | undefined;
        subtitlePreset?: string | undefined;
        subtitleColor?: string | undefined;
        subtitleHighlightColor?: string | undefined;
        subtitleGlow?: boolean | undefined;
        subtitleGlowColor?: string | undefined;
        subtitleOutline?: string | boolean | undefined;
        subtitleOutlineWidth?: number | undefined;
        subtitleBox?: boolean | undefined;
        subtitleBoxColor?: string | undefined;
        subtitleSize?: number | undefined;
        subtitleY?: number | undefined;
        subtitleUppercase?: boolean | undefined;
        karaoke?: boolean | undefined;
        wordTimestamps?: {
            word: string;
            start: number;
            end: number;
            confidence?: number | undefined;
        }[] | undefined;
    }>>;
    voice: z.ZodOptional<z.ZodString>;
    voiceProvider: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    voice?: string | undefined;
    voiceProvider?: string | undefined;
    subtitleSettings?: {
        burnSubtitles: boolean;
        karaoke: boolean;
        subtitlePreset?: string | undefined;
        subtitleColor?: string | undefined;
        subtitleHighlightColor?: string | undefined;
        subtitleGlow?: boolean | undefined;
        subtitleGlowColor?: string | undefined;
        subtitleOutline?: string | boolean | undefined;
        subtitleOutlineWidth?: number | undefined;
        subtitleBox?: boolean | undefined;
        subtitleBoxColor?: string | undefined;
        subtitleSize?: number | undefined;
        subtitleY?: number | undefined;
        subtitleUppercase?: boolean | undefined;
        wordTimestamps?: {
            word: string;
            start: number;
            end: number;
            confidence?: number | undefined;
        }[] | undefined;
    } | undefined;
}, {
    voice?: string | undefined;
    voiceProvider?: string | undefined;
    subtitleSettings?: {
        burnSubtitles?: boolean | undefined;
        subtitlePreset?: string | undefined;
        subtitleColor?: string | undefined;
        subtitleHighlightColor?: string | undefined;
        subtitleGlow?: boolean | undefined;
        subtitleGlowColor?: string | undefined;
        subtitleOutline?: string | boolean | undefined;
        subtitleOutlineWidth?: number | undefined;
        subtitleBox?: boolean | undefined;
        subtitleBoxColor?: string | undefined;
        subtitleSize?: number | undefined;
        subtitleY?: number | undefined;
        subtitleUppercase?: boolean | undefined;
        karaoke?: boolean | undefined;
        wordTimestamps?: {
            word: string;
            start: number;
            end: number;
            confidence?: number | undefined;
        }[] | undefined;
    } | undefined;
}>;
export type RenderOrchestrationState = z.infer<typeof RenderOrchestrationStateSchema>;
/**
 * Validation helpers
 */
export declare function validateRenderParams(data: unknown): RenderParams;
export declare function safeParseRenderParams(data: unknown): {
    success: true;
    data: RenderParams;
} | {
    success: false;
    error: z.ZodError;
};
export declare function validateSubtitleConfig(data: unknown): SubtitleConfig;
export declare function validateRenderBeat(data: unknown): RenderBeat;
//# sourceMappingURL=render-params.d.ts.map