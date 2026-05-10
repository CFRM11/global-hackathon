export type Phase = "broad" | "refinement" | "final";

export interface Option {
  id: number;
  label: string;
  description: string;
  emoji: string;
  tags: string[];
}

export interface FinalPlan {
  activity: string;
  details: string;
  duration: string;
  required_tags: string[];
}

export interface PathfinderResponse {
  phase: Phase;
  active_filters?: string[];
  title: string;
  options?: Option[];
  final_plan?: FinalPlan | null;
}
