/**
 * questionBank — typed access to the extracted questions.
 *
 * M5.2: this file now re-exports from `./lessons` which is the canonical
 * data layer. New UI code should import directly from `./lessons` so it
 * can use the richer LessonWithSlides / Slide types.
 */

export {
  allLessons,
  allLegacyLessons,
  allQuestions,
  getLesson,
  getLessonById,
  getLessonsForModule,
  getQuestion,
  getQuestionImage,
  getQuestionsForLesson,
  getSlideById,
  lessonById,
  lessonsFile,
  questionBank,
  questionImageMap,
} from "./lessons";
