/**
 * Maps Thinkific lessons to GrowthZone certification modules (components) for the
 * "Folding Carton Essentials" certification.
 *
 * GrowthZone only tracks completion at the module/course level. The 15 completable
 * components correspond 1:1 to the `module` values below (which equal the GrowthZone
 * component `Name`). A Thinkific lesson.completed event is mapped to its module, and
 * the GrowthZone module is marked complete only once the whole Thinkific course is done.
 *
 * `module` strings MUST exactly match the GrowthZone component `Name` (resolved by name
 * at runtime). `componentId` values are the observed GrowthZone CertificationComponentId
 * for the current tenant and are kept for reference/fallback only.
 *
 * Lessons not listed here (e.g. "Welcome to PPCU") intentionally map to nothing and are ignored.
 */

export const MODULE_COMPONENT_IDS = {
  "Folding Carton Beginner Essentials": 29860,
  "Virgin Paperboard": 29861,
  "Recovered Fiber": 29862,
  "Recycled Paperboard": 29863,
  "Design and Pre-Press Considerations": 29864,
  "Color Theory": 29865,
  "Inks and Coatings": 29866,
  "Printing Processes": 29868,
  Tooling: 29867,
  "Cutting, Stripping, and Blanking": 29869,
  Adhesives: 29870,
  "Window Patching": 29871,
  "Finishing, Folding, Gluing & Carton Styles": 29872,
  "Sustainability in the Paperboard Packaging Industry": 29873,
  "Paperboard Packaging Council Final Exam": 29874,
};

/**
 * One record per Thinkific lesson (objective). Cleaned from the source export
 * (fixed the malformed entries at codes 1.6 and 8.2).
 */
export const LESSON_OBJECTIVES = [
  { code: "1.1", objectiveId: 4729, certificationComponentObjectiveId: 2886, objective: "What is a Folding Carton?", module: "Folding Carton Beginner Essentials", thinkificLessonId: 75655462 },
  { code: "1.2", objectiveId: 4730, certificationComponentObjectiveId: 2887, objective: "Paperboard Packaging Industry Overview", module: "Folding Carton Beginner Essentials", thinkificLessonId: 75658789 },
  { code: "1.3", objectiveId: 4731, certificationComponentObjectiveId: 2888, objective: "Sustainability Overview", module: "Folding Carton Beginner Essentials", thinkificLessonId: 75683240 },
  { code: "1.4", objectiveId: 4732, certificationComponentObjectiveId: 2889, objective: "Web & Sheet Fed Operations", module: "Folding Carton Beginner Essentials", thinkificLessonId: 75686668 },
  { code: "1.5", objectiveId: 4733, certificationComponentObjectiveId: 2890, objective: "Paper Grain", module: "Folding Carton Beginner Essentials", thinkificLessonId: 75686771 },
  { code: "1.6", objectiveId: 4734, certificationComponentObjectiveId: 2891, objective: "Measuring a Carton", module: "Folding Carton Beginner Essentials", thinkificLessonId: 75687425 },
  { code: "1.7", objectiveId: 4735, certificationComponentObjectiveId: 2892, objective: "Operations Overview", module: "Folding Carton Beginner Essentials", thinkificLessonId: 75687555 },
  { code: "1.8", objectiveId: 4736, certificationComponentObjectiveId: 2893, objective: "Automatic Packaging", module: "Folding Carton Beginner Essentials", thinkificLessonId: 75683160 },
  { code: "2.1", objectiveId: 4738, certificationComponentObjectiveId: 2894, objective: "Forestry Overview", module: "Virgin Paperboard", thinkificLessonId: 75687892 },
  { code: "2.2", objectiveId: 4739, certificationComponentObjectiveId: 2895, objective: "Raw Materials: Fiber & Pulp", module: "Virgin Paperboard", thinkificLessonId: 75688044 },
  { code: "2.3", objectiveId: 4740, certificationComponentObjectiveId: 2896, objective: "Pre-Papermaking: Stock Prep", module: "Virgin Paperboard", thinkificLessonId: 75688436 },
  { code: "2.5", objectiveId: 4742, certificationComponentObjectiveId: 2897, objective: "Troubleshooting", module: "Virgin Paperboard", thinkificLessonId: 75688895 },
  { code: "3.1", objectiveId: 4744, certificationComponentObjectiveId: 2898, objective: "Recovered Fiber for Folding Cartons", module: "Recovered Fiber", thinkificLessonId: 75687371 },
  { code: "3.2", objectiveId: 4745, certificationComponentObjectiveId: 2899, objective: "Supply, Demand, and Recovery Rates", module: "Recovered Fiber", thinkificLessonId: 75687573 },
  { code: "4.1", objectiveId: 4747, certificationComponentObjectiveId: 2900, objective: "Recycled Paperboard Overview", module: "Recycled Paperboard", thinkificLessonId: 75687695 },
  { code: "4.2", objectiveId: 4748, certificationComponentObjectiveId: 2901, objective: "Stock Preparation", module: "Recycled Paperboard", thinkificLessonId: 75688002 },
  { code: "4.3", objectiveId: 4749, certificationComponentObjectiveId: 2902, objective: "Recycled Papermaking", module: "Recycled Paperboard", thinkificLessonId: 75688608 },
  { code: "4.4", objectiveId: 4750, certificationComponentObjectiveId: 2903, objective: "Board Grades & Properties", module: "Recycled Paperboard", thinkificLessonId: 75689033 },
  { code: "5.1", objectiveId: 4752, certificationComponentObjectiveId: 2904, objective: "Supply Chain, Structure, and Design Overview", module: "Design and Pre-Press Considerations", thinkificLessonId: 75689542 },
  { code: "5.2", objectiveId: 4753, certificationComponentObjectiveId: 2905, objective: "Structural Design", module: "Design and Pre-Press Considerations", thinkificLessonId: 75689853 },
  { code: "5.3", objectiveId: 4754, certificationComponentObjectiveId: 2906, objective: "Graphic Design", module: "Design and Pre-Press Considerations", thinkificLessonId: 75689981 },
  { code: "5.4", objectiveId: 4755, certificationComponentObjectiveId: 2907, objective: "Pre-Press and Layout", module: "Design and Pre-Press Considerations", thinkificLessonId: 75690759 },
  { code: "6.1", objectiveId: 4757, certificationComponentObjectiveId: 2908, objective: "Color Theory Overview", module: "Color Theory", thinkificLessonId: 75704516 },
  { code: "6.2", objectiveId: 4758, certificationComponentObjectiveId: 2909, objective: "Color \u0394E & Expanded Gamut", module: "Color Theory", thinkificLessonId: 75704681 },
  { code: "7.1", objectiveId: 4760, certificationComponentObjectiveId: 2910, objective: "Inks & Coatings Overview", module: "Inks and Coatings", thinkificLessonId: 75707072 },
  { code: "7.2", objectiveId: 4761, certificationComponentObjectiveId: 2911, objective: "Inks & Coatings Colors", module: "Inks and Coatings", thinkificLessonId: 75707354 },
  { code: "7.3", objectiveId: 4762, certificationComponentObjectiveId: 2912, objective: "Inks & Coatings Properties", module: "Inks and Coatings", thinkificLessonId: 75707757 },
  { code: "8.1", objectiveId: 4764, certificationComponentObjectiveId: 2916, objective: "Printing Processes Overview", module: "Printing Processes", thinkificLessonId: 75714096 },
  { code: "8.2", objectiveId: 4765, certificationComponentObjectiveId: 2917, objective: "Sheet-Fed Lithography (Offset)", module: "Printing Processes", thinkificLessonId: 75714945 },
  { code: "8.3", objectiveId: 4766, certificationComponentObjectiveId: 2918, objective: "Web-Fed Lithography (Offset)", module: "Printing Processes", thinkificLessonId: 75715313 },
  { code: "8.4", objectiveId: 4767, certificationComponentObjectiveId: 2919, objective: "Flexography", module: "Printing Processes", thinkificLessonId: 75716021 },
  { code: "8.5", objectiveId: 4768, certificationComponentObjectiveId: 2920, objective: "Gravure, Letterpress, and Screen Printing", module: "Printing Processes", thinkificLessonId: 75716390 },
  { code: "8.6", objectiveId: 4769, certificationComponentObjectiveId: 2921, objective: "Digital Printing", module: "Printing Processes", thinkificLessonId: 75716577 },
  { code: "8.7", objectiveId: 4770, certificationComponentObjectiveId: 2922, objective: "Cold Foil", module: "Printing Processes", thinkificLessonId: 75717050 },
  { code: "9.1", objectiveId: 4772, certificationComponentObjectiveId: 2913, objective: "Tooling Overview", module: "Tooling", thinkificLessonId: 75708029 },
  { code: "9.2", objectiveId: 4773, certificationComponentObjectiveId: 2914, objective: "Cutting Tools", module: "Tooling", thinkificLessonId: 75708354 },
  { code: "9.3", objectiveId: 4774, certificationComponentObjectiveId: 2915, objective: "Stripping and Blanking Tools", module: "Tooling", thinkificLessonId: 75708238 },
  { code: "10.1", objectiveId: 4776, certificationComponentObjectiveId: 2923, objective: "Platen Die Cutting Overview", module: "Cutting, Stripping, and Blanking", thinkificLessonId: 75710851 },
  { code: "10.2", objectiveId: 4777, certificationComponentObjectiveId: 2924, objective: "Feeder and Feed Table", module: "Cutting, Stripping, and Blanking", thinkificLessonId: 75710939 },
  { code: "10.3", objectiveId: 4778, certificationComponentObjectiveId: 2925, objective: "Platen Cutting", module: "Cutting, Stripping, and Blanking", thinkificLessonId: 75711371 },
  { code: "10.4", objectiveId: 4779, certificationComponentObjectiveId: 2926, objective: "Stripping and Blanking", module: "Cutting, Stripping, and Blanking", thinkificLessonId: 75731592 },
  { code: "10.5", objectiveId: 4780, certificationComponentObjectiveId: 2927, objective: "Air Hammer Stripping", module: "Cutting, Stripping, and Blanking", thinkificLessonId: 75731656 },
  { code: "10.6", objectiveId: 4781, certificationComponentObjectiveId: 2928, objective: "Cutting Delivery", module: "Cutting, Stripping, and Blanking", thinkificLessonId: 75731720 },
  { code: "10.7", objectiveId: 4782, certificationComponentObjectiveId: 2929, objective: "Value Added Processes", module: "Cutting, Stripping, and Blanking", thinkificLessonId: 75715836 },
  { code: "10.8", objectiveId: 4783, certificationComponentObjectiveId: 2930, objective: "Rotary Die Cutting", module: "Cutting, Stripping, and Blanking", thinkificLessonId: 75714926 },
  { code: "11.1", objectiveId: 4785, certificationComponentObjectiveId: 2931, objective: "Adhesives Overview", module: "Adhesives", thinkificLessonId: 75731912 },
  { code: "11.2", objectiveId: 4786, certificationComponentObjectiveId: 2932, objective: "Adhesives Deep Dive", module: "Adhesives", thinkificLessonId: 75732119 },
  { code: "12.1", objectiveId: 4788, certificationComponentObjectiveId: 2933, objective: "Windowing Overview", module: "Window Patching", thinkificLessonId: 75733661 },
  { code: "12.2", objectiveId: 4789, certificationComponentObjectiveId: 2934, objective: "Windowing Materials", module: "Window Patching", thinkificLessonId: 75733750 },
  { code: "12.3", objectiveId: 4790, certificationComponentObjectiveId: 2935, objective: "Windowing Inline and Offline Patching", module: "Window Patching", thinkificLessonId: 75734162 },
  { code: "13.1", objectiveId: 4792, certificationComponentObjectiveId: 2936, objective: "Folder Gluer Overview", module: "Finishing, Folding, Gluing & Carton Styles", thinkificLessonId: 75835348 },
  { code: "13.2", objectiveId: 4793, certificationComponentObjectiveId: 2937, objective: "Carton Styles Part I", module: "Finishing, Folding, Gluing & Carton Styles", thinkificLessonId: 75837932 },
  { code: "13.3", objectiveId: 4794, certificationComponentObjectiveId: 2938, objective: "Carton Styles Part II", module: "Finishing, Folding, Gluing & Carton Styles", thinkificLessonId: 75838256 },
  { code: "13.4", objectiveId: 4795, certificationComponentObjectiveId: 2939, objective: "Folder Gluer Essentials & Operations", module: "Finishing, Folding, Gluing & Carton Styles", thinkificLessonId: 75838633 },
  { code: "13.5", objectiveId: 4796, certificationComponentObjectiveId: 2940, objective: "Folder Gluer Auxiliary Equipment", module: "Finishing, Folding, Gluing & Carton Styles", thinkificLessonId: 75838893 },
  { code: "14.1", objectiveId: 4798, certificationComponentObjectiveId: 2941, objective: "Sustainability in the Paperboard Packaging Industry", module: "Sustainability in the Paperboard Packaging Industry", thinkificLessonId: 75731910 },
  { code: "15.1", objectiveId: 4800, certificationComponentObjectiveId: 2942, objective: "Final Exam", module: "Paperboard Packaging Council Final Exam", thinkificLessonId: 75845586 },
];

export const LESSON_TO_MODULE = LESSON_OBJECTIVES.reduce((acc, row) => {
  acc[String(row.thinkificLessonId)] = row.module;
  return acc;
}, {});

/**
 * Returns the GrowthZone module/component name for a Thinkific lesson id, or null
 * when the lesson is not part of the certification.
 */
export function getModuleForLesson(lessonId) {
  if (lessonId === null || lessonId === undefined) return null;
  return LESSON_TO_MODULE[String(lessonId)] || null;
}
