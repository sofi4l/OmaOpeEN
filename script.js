let currentQuestion = ''; // Variable to store the current question
let correctAnswer = ''; // Variable to store the correct answer

document.getElementById('send-button').addEventListener('click', sendMessage); // Trigger the sendMessage function when user clicks send-button
document.getElementById('send-images-button').addEventListener('click', sendImages); // Trigger the sendImages function when user clicks send-button
document.getElementById('send-answer-button').addEventListener('click', sendAnswer); // Trigger the sendAnswer function when user clicks send-button

document.getElementById('user-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      sendMessage(); // Trigger the sendMessage function when "Enter" is pressed
    }
  });

document.getElementById('answer-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      sendAnswer(); // Trigger the sendAnswer function when "Enter" is pressed
    }
  });

async function sendImages() { // Declares an asynchronous function
   
    const imageInput = document.getElementById('image-input'); // Retrieves the file input element with id="image-input" and stores it in the imageInput variable.
    const files = imageInput.files; // Holds the list of files that the user selected

    if (files.length === 0) { // Checks if the user has selected any files. If no files are selected (files.length === 0),
        alert('Valitse kuvia ensin.'); // an alert is displayed asking the user to select images first, and the function exits early (return).
        return;
    }

    // Create a new FormData object to hold the files to be sent
    const formData = new FormData();
    // Loop through all the selected files and append them to the FormData object under the key 'images'.
    for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
    }

    // debugging: console.log(formData.getAll('images'));

    try { // Makes an asynchronous HTTP POST request to the /upload-Images endpoint,
        const response = await fetch('/upload-Images', { // sending the formData containing the selected images.
            method: 'POST', // The await keyword ensures that the code waits for the fetch request to complete before moving to the next line.
            body: formData
        });

        const data = await response.json(); // Converts the response from the server into a JSON object and stores it in the data variable.
        currentQuestion = data.question; // Extracts question and answer from the server's response and assigns them to the 
        correctAnswer = data.answer; // currentQuestion and correctAnswer variables.
        console.log(currentQuestion); // debugging
        console.log(correctAnswer); // debugging
        addMessageToChatbox('OmaOpe: ' + data.question, 'bot-message', 'omaopebox'); // Calls the addMessageToChatbox function to display the received question in the chatbox,
        // with 'OmaOpe: ' as a prefix, using the bot-message CSS class in the omaopebox container.

  
      }  catch(error) { // The try block is followed by a catch block to handle any errors that may occur during the fetch request or while processing the response.
        console.error('Error:', error); // If an error occurs, it is logged to the console (outputs messages in red or another attention-grabbing color to signal an error)
        addMessageToChatbox('ChatGPT: Jotain meni pieleen. Yritä uudelleen myöhemmin.', 'bot-message', 'omaopebox'); // and a message is added to the chatbox
    };
   
}

async function sendMessage() { // Declares an asynchronous function and will use await to handle promises.
    const userInput = document.getElementById('user-input').value; // Retrieves the value from the input field with id="user-input"
    if (userInput.trim() === '') return; // Checks if the input is empty or consists only of whitespace. If it is, the function returns early, preventing further execution.
    //debugging: console.log(userInput);

    addMessageToChatbox('Sinä: ' + userInput, 'user-message', 'chatbox'); // Calls the addMessageToChatbox function to add the user's message to the chatbox,
    // with 'Sinä: ' as a prefix, using the user-message CSS class in the chatbox container.

    try { // Makes an asynchronous HTTP POST request to the /chat endpoint, with the userInput in JSON format
        const response = await fetch('/chat', { // The await keyword is used to wait for the response from the server.
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question: userInput })    
        });

 
    console.log(response); // Logs the response object to the console for debugging.
    const data = await response.json(); // Converts the response to JSON and logs the data.reply to the console,
    console.log(data.reply); // where data.reply is expected to be the server's reply.

    addMessageToChatbox('ChatGPT: ' + data.reply, 'bot-message', 'chatbox'); // Calls addMessageToChatbox to add the server's reply to the chatbox.
    // The message is prefixed with 'ChatGPT: ' and styled with the 'bot-message' class in the chatbox container.

    } catch(error) { // Catches and handles any errors that occur during the fetch request or processing.
        console.error('Error:', error); // If an error occurs, it is logged to the console (outputs messages in red or another attention-grabbing color to signal an error)
        addMessageToChatbox('ChatGPT: Jotain meni pieleen. Yritä uudelleen myöhemmin.', 'bot-message', 'chatbox'); // and a message is added to the chatbox
    }; 

    // Clears the input field after sending the message and processing the server's response.
    document.getElementById('user-input').value = '';

}


async function sendAnswer() { // Declares an asynchronous function, the async keyword is used because the function includes asynchronous operations
    const answerInput = document.getElementById('answer-input').value; // Retrieves the value from the input field with id="answer-input".
    if (answerInput.trim() === '') return; // Checks if the input is empty or contains only whitespace. If true, the function exits early to prevent sending an empty answer.
    // debug: console.log(answerInput);

    addMessageToChatbox('Sinä: ' + answerInput, 'user-message', 'omaopebox'); // Calls addMessageToChatbox to display the user’s answer in the chatbox.
    // The message is prefixed with 'Sinä: ' and uses the 'user-message' class within the 'omaopebox' container.

    try { // Makes an asynchronous HTTP POST request to the /check-answer endpoint, with the user's answer and the correct answer as JSON.
        const response = await fetch('/check-answer', { // The await keyword ensures that the function waits for the response before proceeding.
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_answer: answerInput, correct_answer: correctAnswer })    
        });

     console.log(response); // Logs the response object to the console for debugging.
     const data = await response.json(); // Converts the response to JSON and logs the data.evaluation to the console,
     console.log(data.evaluation); // which is expected to be the evaluation of the user's answer.
   
     addMessageToChatbox('Oma Ope:'+ data.evaluation, 'bot-message', 'omaopebox'); // Calls addMessageToChatbox to display the server's evaluation in the chatbox.
     // The message is prefixed with 'Oma Ope: ' and uses the 'bot-message' class within the 'omaopebox' container.
     fetchNextQuestion(); // Calls fetchNextQuestion() to presumably fetch and display the next question.
   
    } catch(error) { // Catches any errors that occur during the fetch request or while processing the response.
       console.error('Error:', error); // If an error occurs, it is logged to the console (outputs messages in red or another attention-grabbing color to signal an error)
       addMessageToChatbox('ChatGPT: Jotain meni pieleen. Yritä uudelleen myöhemmin.', 'bot-message', 'omaopebox'); // and a message is added to the chatbox
   }; 
   
    document.getElementById('answer-input').value = ''; // Clears the answer input field after the answer has been processed and displayed.
   
}


async function fetchNextQuestion() { // Declares an asynchronous function, the async keyword indicates that this function will contain asynchronous operations and will use await for handling promises.

    try { // Makes an asynchronous HTTP POST request to the /next-question endpoint
      const response = await fetch('/next-question', { // Sets the Content-Type header to application/json, indicating that the server expects a JSON payload.
        method: 'POST',
        headers: {
            'Content-Type': 'application/json' // The request body is not necessary if the server already knows which question to serve next.
        },
    });

    const data = await response.json(); // Converts the server's response to JSON and assigns it to the data variable.
        currentQuestion = data.question; // Updates the currentQuestion and correctAnswer variables with values from the server response.
        correctAnswer = data.answer;
        console.log(currentQuestion); // debugging
        console.log(correctAnswer); // debugging
        addMessageToChatbox('OmaOpe: ' + data.question, 'bot-message', 'omaopebox'); // Calls addMessageToChatbox to display the new question in the chatbox,
        // prefixed with 'OmaOpe: ' and styled with the 'bot-message' class in the 'omaopebox' container.
 
    /* .then(response => response.json())
    .then(data => {
        if (data.error) {
            addMessageToChatbox('Error: ' + data.error, 'bot-message');
        } else {
            currentQuestion = data.question;
            correctAnswer = data.answer;
            addMessageToChatbox('OmaOpe: ' + data.question, 'bot-message');
        }
    }) represents an alternative approach to handling promises using .then() instead of async/await. It demonstrates how you could handle success and error cases in promise chains. Since you are using async/await, this block is not needed.*/

    } catch(error) { // Catches any errors that occur during the fetch request or while processing the response.
        console.error('Error:', error); // If an error occurs, it is logged to the console (outputs messages in red or another attention-grabbing color to signal an error)
        addMessageToChatbox('ChatGPT: Jotain meni pieleen. Yritä uudelleen myöhemmin.', 'bot-message', 'omaopebox'); // and a message is added to the chatbox
    }; 
}

function addMessageToChatbox(message, className, box) { // function is designed to add a message to a specified chatbox
    const messageElement = document.createElement('div'); // Creates a new <div> element to contain the message that will be displayed in the chatbox.
    messageElement.classList.add('message', className); // Adds CSS classes to the <div> element. The 'message' class is always added, and className is a dynamic class that allows for additional styling
    messageElement.textContent = message; // Sets the text content of the <div> element to the message passed to the function.
    console.log(messageElement); // debugging
    document.getElementById(box).appendChild(messageElement); // Appends the newly created <div> element to the chatbox container specified by the box parameter. This updates the chatbox with the new message.
    console.log(document.getElementById(box)); // debugging
    //document.getElementById('chatbox').scrollTop = document.getElementById('chatbox').scrollHeight; ensures that the latest message is visible. 
}
