import { Exams } from "../../../store/Exams";

export const getExamParts = (name) => {
  return Exams.find((exam) => exam.examName === name).examParts;
};

export const examOptions = Exams.map((exam) => {
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
