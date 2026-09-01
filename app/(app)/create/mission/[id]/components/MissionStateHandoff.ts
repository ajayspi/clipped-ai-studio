import { useWizardStore, Beat } from "@/components/wizard/wizard-store";
import { MissionJobState } from "@/lib/engine/types";

export function transferMissionToWizard(mission: MissionJobState, router: any) {
  const beats: Beat[] = (mission.scenes || []).map((scene, idx) => {
    const clipUrl = scene.videoUrl || scene.imageUrl || scene.selectedVideo?.url || '';
    return {
      id: scene.id || `beat-${idx + 1}`,
      text: scene.text || '',
      keywords: scene.keywords || [],
      duration: scene.duration || 4,
      selectedId: `cand-${idx + 1}-0`,
      candidates: clipUrl
        ? [
            {
              id: `cand-${idx + 1}-0`,
              url: clipUrl,
              title: scene.description || `Scene ${idx + 1}`,
              platform: scene.selectedVideo?.platform || 'pexels',
              thumbnail: scene.selectedVideo?.thumbnail || scene.imageUrl || clipUrl,
              duration: scene.duration || 4,
              score: 1.0,
              reason: 'Mission Mode Sourced Asset',
            },
          ]
        : [],
    };
  });

  // Hydrate store
  useWizardStore.setState({
    workflowType: 'footage',
    subject: mission.prompt || '',
    narration: mission.script || '',
    aspectRatio: (mission.aspectRatio as any) || '9:16',
    voice: mission.voice || 'alloy',
    beats: beats,
    step: beats.length > 0 ? 1 : 0,
    furthestStep: 4,
    autoMode: false,
    error: null,
    busy: null,
  });

  // Navigate to footage wizard
  router.push('/create/footage');
}
