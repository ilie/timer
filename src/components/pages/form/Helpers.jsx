import { exams } from "../../../config/exams";

export const getExamParts = (name) => {
  return exams.find((exam) => exam.examName === name).examParts;
};

export const examOptions = exams.map((exam) => {
  return (
    <option key={exam.examName} value={exam.examName}>
      {exam.examName}
    </option>
  );
});

export const examPartOptions = (parts) => {
  return parts.map((part) => {
    return (
      <option key={part.id} value={part.name}>
        {part.name}
      </option>
    );
  });
};
