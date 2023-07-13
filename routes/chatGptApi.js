const router = require('express').Router();
const API_KEY = process.env.OPENAI_API_KEY;
const List = require("../models/listModel");
function parseQuestionFormat(questionFormat) {
  try {
    // Determine the splitting pattern based on the presence of double newlines
    const splittingPattern = questionFormat.includes('\n\n') ? '\n\n' : '\n';

    // Split the format into different questions
    const questions = questionFormat.split(splittingPattern);

    // Process each question
    const questionObjects = questions.map(questionString => {
      // Split the question string into different parts
      const parts = questionString.split(';');

      let question = parts[0].trim();
      const choices = parts.slice(1).map(choice => choice.trim());

      // Remove numbering prefix if present
      const numberingPrefixRegex = /^[0-9]+\.\s/;
      if (numberingPrefixRegex.test(question)) {
        question = question.replace(numberingPrefixRegex, '');
      }

      return {
        "question": question,
        "answer": choices[0].trim(),
        "distractors": choices.slice(1).map(distractor => ({ "distractor": distractor.trim() }))
      };
    });

    return questionObjects;
  } catch (error) {
    console.error(error);
    return null; // or return an empty array: []
  }
}

const validateToken = require("../middleware/validationHandler");
router.use(validateToken);
router.route("/").post(async (req, res) => {
  let useCase;
  if (req.body.type === "True/False") {
    useCase = " connect a question and all choices using semicolon, first choice is the answer\n" +
      "Example of random True/False question:\n" +
      "1. The capital city of France is London.;False;True\n" +
      "generate your output in " + req.body.language + " language ";
  }

  else {

    useCase = "Connect a question, answer, and distractors using semicolons, where the first choice is the answer.\n" +
      "Example of random MCQ question:\n" +
      "1. What is the capital city of France?;Paris;London;Rome;Berlin";

    // useCase = " first choice is the answer\n"
    // +"use case:\n"
    // +"1.question\n"
    // +"a)answer\n"
    // +"b)distractor\n"
    // +"c)distractor\n"
    // +"d)distractor"
  }

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo-0613",
      // "model": "gpt-4",
      messages: [{
        "role": "user",
        "content": " Generate " + req.body.number + " " + req.body.type + " question/s based on content."
          + "please follow this format!" + useCase + "\n\n content="
          + "{" + req.body.message + "}"
          + "generate your output in " + req.body.language + " language and make your question as " + req.body.difficulty + " as possible"
      }],
      max_tokens: 1300,
      temperature: 0.3,
      top_p: 0.3,
    })
  }
  console.log(options.body)
  try {
    let questions;
      // create a callback function with error handling for the fetch API call
      const fetchData = async () => {
        const response = await fetch("https://api.openai.com/v1/chat/completions", options);
        const data = await response.json();
  
        if (data.error && data.error.type) {
          console.log(data.error)
          if (data.error.type === "server_error") {
            // Retry the API call if it's a server error
            return fetchData();
          } else {
            throw new Error("Exceeded token limit");
          }
        }else if( data.choices[0].message.content){
          questions = await parseQuestionFormat(data.choices[0].message.content);
          if (!questions) {
            // If there was an error parsing the questions, retry the API call
            return fetchData();
          }
        }
        return data;
      };
  
      // Call the fetchData function to get the API response
      const data = await fetchData();


    console.log(questions)
    const { title, language, type, _id } = req.body;
    console.log(_id)
    if (_id) {
      console.log(_id)
      const list = await List.findById({ _id });
      if (list) {


        if (list.type !== type) {
          list.type = "Custom";
        }
        if (list.language !== language) {
          list.language = "Custom";
        }
        // Add the question to the list's questions array
        list.questions.push(...questions);
        console.log(_id);
        // Save the updated list
        const newlist = await list.save();
        // Return a success response or perform additional actions
        res.status(200).json(newlist);

      } else {
        // Handle the case where the list is not found
        res.status(404).json({ message: "List not found" });
      }
    } else {
      if (!title || !questions) {
        res.status(400);
        throw new Error("Please add title and questions !");
      }
      const list = await List.create({
        title,
        questions,
        user_id: req.user.id,
        type,
        language
      });
      console.log(list)
      res.status(201).json(list);
    }
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: "The input exceeds the maximum length." });
  }
})

module.exports = router;