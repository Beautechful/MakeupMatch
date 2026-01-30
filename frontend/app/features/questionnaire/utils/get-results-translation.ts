// Merges questions and answers into a merged_answers object for submission
// questions: the questions object (with language arrays)
// answers: the answers array (with .value for each question)
// language: the language string (e.g., 'en')

export function mergeQuestionsAndAnswers(
  questions: any,
  answers: any[],
  language: string,
) {
  const merged_answers: any[] = [];
  const questionsArr = questions[language];
  if (!questionsArr || !Array.isArray(questionsArr)) return { answers: [] };

  for (let i = 0; i < questionsArr.length; i++) {
    const q = questionsArr[i];
    const a = answers[i]?.value;
    if (q.question_type === 'camera') {
      merged_answers.push({
        type: 'camera',
        features: a ?? null,
      });
    } else if (q.question_type === 'scan') {
      merged_answers.push({
        type: 'scan',
        scanResult: a ?? null,
      });
    } else if (q.question_type === 'options') {
      let answerText = null;
      if (typeof a === 'number' && Array.isArray(q.answer_options)) {
        answerText = q.answer_options[a] ?? null;
      }
      if (typeof a === 'string') {
        answerText = a;
      }
      merged_answers.push({
        type: 'options',
        answer: answerText,
        question_name: q.question_name,
        question: q.question_text,
        options: q.answer_options ?? [],
      });
    }
  }
  return merged_answers;
}
