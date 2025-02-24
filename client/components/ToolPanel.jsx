import { useEffect, useState } from "react";

const functionDescription = `
Call this function to display the word spelled by the user and provide feedback on accuracy.
`;

const sessionUpdate = {
  type: "session.update",
  session: {
    tools: [
      {
        type: "function",
        name: "display_spelled_word",
        description: functionDescription,
        parameters: {
          type: "object",
          properties: {
            word: {
              type: "string",
              description: "The word spelled by the user.",
            },
            correctWord: {
              type: "string",
              description: "The correct spelling of the word.",
            },
          },
          required: ["word", "correctWord"],
        },
      },
    ],
    tool_choice: "auto",
  },
};

function FunctionCallOutput({ functionCallOutput }) {
  const { word, correctWord } = JSON.parse(functionCallOutput.arguments);
  const isCorrect = word.trim().toLowerCase() === correctWord.toLowerCase();

  return (
    <div className="flex flex-col gap-2">
      <p>Spelled Word: <strong>{word}</strong></p>
      <p>
        {isCorrect ? (
          <span className="text-green-600">Correct! Well done.</span>
        ) : (
          <span className="text-red-600">Incorrect. The correct spelling is "{correctWord}".</span>
        )}
      </p>
      <pre className="text-xs bg-gray-100 rounded-md p-2 overflow-x-auto">
        {JSON.stringify(functionCallOutput, null, 2)}
      </pre>
    </div>
  );
}

export default function ToolPanel({
  isSessionActive,
  sendClientEvent,
  events,
}) {
  const [functionAdded, setFunctionAdded] = useState(false);
  const [functionCallOutput, setFunctionCallOutput] = useState(null);
  const [practicedWords, setPracticedWords] = useState([]);
  const [showAllWords, setShowAllWords] = useState(false);

  useEffect(() => {
    if (!events || events.length === 0) return;

    const firstEvent = events[events.length - 1];
    if (!functionAdded && firstEvent.type === "session.created") {
      sendClientEvent(sessionUpdate);
      setFunctionAdded(true);
    }

    const mostRecentEvent = events[0];
    if (
      mostRecentEvent.type === "response.done" &&
      mostRecentEvent.response.output
    ) {
      mostRecentEvent.response.output.forEach((output) => {
        if (
          output.type === "function_call" &&
          output.name === "display_spelled_word"
        ) {
          const { correctWord } = JSON.parse(output.arguments);
          setFunctionCallOutput(output);
          setPracticedWords(prevWords => [...prevWords, correctWord]);
          setTimeout(() => {
            sendClientEvent({
              type: "response.create",
              response: {
                instructions: `
                Provide feedback on the spelled word and encourage the user to spell another word.
              `,
              },
            });
          }, 500);
        }
      });
    }
  }, [events]);

  useEffect(() => {
    if (!isSessionActive) {
      setFunctionAdded(false);
      setFunctionCallOutput(null);
    }
  }, [isSessionActive]);

  return (
    <section className="h-full w-full flex flex-col gap-4">
      <div className="h-full bg-gray-50 rounded-md p-4">
        <h2 className="text-lg font-bold">Spelling Tool</h2>
        {isSessionActive ? (
          functionCallOutput ? (
            <FunctionCallOutput functionCallOutput={functionCallOutput} />
          ) : (
            <p>Spell a word to see it displayed here...</p>
          )
        ) : (
          <div>
            <p>Session ended. Here are the correct spellings you practiced:</p>
            <button onClick={() => setShowAllWords(!showAllWords)} className="mt-2 p-2 bg-blue-500 text-white rounded-md">
              {showAllWords ? "Hide Words" : "Show All Correct Spellings"}
            </button>
            {showAllWords && (
              <ul className="mt-2">
                {practicedWords.map((word, index) => (
                  <li key={index}>{word}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
