type CourseMetadataSource = {
  learningOutcomes?: unknown;
  targetAudience?: unknown;
  targetNeed?: unknown;
  courseGroup?: unknown;
};

export function trainingMetadata(course: CourseMetadataSource) {
  let raw = course.learningOutcomes;
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { raw = null; }
  }
  const metadata = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const text = (...values: unknown[]) => values.find(value => typeof value === 'string' && value.trim()) as string | undefined;
  const goals = Array.isArray(raw) ? raw : metadata.outcomes ?? metadata.learningOutcomes ?? metadata.learning_outcomes;
  return {
    targetAudience: (text(course.targetAudience, metadata.targetAudience, metadata.target_audience) || '').trim(),
    targetNeed: (text(course.targetNeed, metadata.targetNeed, metadata.target_need) || '').trim(),
    courseGroup: (text(course.courseGroup, metadata.courseGroup, metadata.course_group) || '').trim(),
    learningOutcomes: Array.isArray(goals) ? goals.filter(value => typeof value === 'string' || value && typeof value === 'object' && !Array.isArray(value)) : [],
  };
}
