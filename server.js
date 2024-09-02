import bodyParser from 'body-parser'; // Middleware to parse incoming request bodies in a middleware before your handlers
import express from 'express'; // Web framework for Node.js, used to create the server
import dotenv from 'dotenv'; // Module to load environment variables from a .env file into process.env
import multer from 'multer'; // Middleware for handling multipart/form-data, which is primarily used for uploading files.
import vision from '@google-cloud/vision'; // Google Cloud Vision API client, used for analyzing images.
import fs from 'fs'; //  Node.js file system module, used to interact with the file system (reading/writing files).

dotenv.config(); // Loads environment variables from a .env file into process.env. This is useful for managing sensitive information such as API keys.

const app = express(); // app: creates an Express application.
const port = 3000; // port: sets the port number where the server will listen for requests.

const upload = multer({ dest: 'uploads/' }); // upload: configures Multer to store uploaded files in the uploads/ directory. The dest option specifies the folder where the files will be saved temporarily.

app.use(bodyParser.json()); // bodyParser.json(): parses incoming JSON requests and puts the parsed data in req.body.
app.use(express.static('public')); // express.static('public'): serves static files (e.g., HTML, CSS, JS) from the public directory.

// Initialize the Google Cloud Vision client
const client = new vision.ImageAnnotatorClient({
    keyFilename: 'omaope-vision.json' // Use a specific JSON file for authentication
});

let koealueTekstina = ''; // Variable to store text related to uploaded images
let context = []; // Variable to store additional context or data
let currentQuestion = ''; // Variable to store the current question
let correctAnswer = ''; // Variable to store the correct answer

// This defines a POST route at the endpoint /upload-Images, handles the upload of up to 10 images at a time.
app.post('/upload-Images', upload.array('images', 10), async (req, res) => {
    console.log('Received images upload');
    // console.log(req);
    const files = req.files; // Retrieves the uploaded files from the request

    // Check if any files were uploaded
    if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded.' });
    }

    // OCR Processing:
    try {
        const texts = await Promise.all(files.map(async file => { // Process all uploaded files, each file is passed to an async function.
        const imagePath = file.path; // Retrieves the path of the uploaded file.
        console.log(imagePath); // Logs the file path for debugging purposes.
        const [result] = await client.textDetection(imagePath);
        // Uses the Google Cloud Vision API to perform text detection on the image.
        // The result is destructured to get the first element of the returned array, which contains the OCR result
        const detections = result.textAnnotations; // Contains the detected text and associated metadata.
        fs.unlinkSync(imagePath); // Removes the temporary file after processing to avoid cluttering the server with unused files.
        return detections.length > 0 ? detections[0].description : ''; // Returns the detected text (if any) for each file. If no text is detected, it returns an empty string.
    }));

    //console.log(texts);
    koealueTekstina = texts.join(''); // Combines the extracted text from all images into a single string.
    console.log('OCR Combined Text:', koealueTekstina); // Logs the combined OCR text for debugging purposes.

    // Initialize context with the combined text
    context = [{ role: 'user', content: koealueTekstina }];

    /* 
   context = context.concat([
    { role: 'user', content: 'Luo yksi yksinkertainen ja selkeä koetehtävä ja sen vastaus yllä olevasta tekstistä suomeksi. Kysy vain yksi asia kerrallaan.' }
  ]); */

    console.log(context); // Logs the context array for debugging purposes.

    // Generate the first question in Finnish using GPT-4
    const response = await fetch('https://api.openai.com/v1/chat/completions', { // Sends a POST request to OpenAI's API endpoint for generating completions using the specified model.
        method: 'POST',
        headers: {
            'Content-Type': 'application/json', // Specifies that the request body is in JSON format.
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` // Uses an API key stored in an environment variable for authentication
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini', // Specifies the GPT model to use
            messages: context.concat([ // Combines the existing context with a new user message
                { role: 'system', content: 'Luo yksi yksinkertainen ja selkeä kysymys ja sen vastaus yllä olevasta tekstistä suomeksi. Kysy vain yksi asia kerrallaan.' }
            ]),
            max_tokens: 50 // Limits the response to 50 tokens
        })

    });

    
    const data = await response.json(); // Converts the response from the API into a JSON object.
    console.log(data.choices[0].message); // Logs the first message choice returned by the API (this line assumes that the API returned valid data)
    console.log('API response:', JSON.stringify(data)); // Logs the entire response data for debugging purposes.

    const responseText = data.choices[0].message.content.trim(); // Extracts the content of the message returned by the API and trims any leading or trailing whitespace
    console.log('Response Text:', responseText); // / Logs response text for debugging purposes.

    const [question, answer] = responseText.includes('Vastaus:') // Checks if the response includes the string "Vastaus:",
            ? responseText.split('Vastaus:') // If it does, the response is split into a question and an answer,
            : [responseText, null]; // If not, the answer is set to null.

    console.log('Parsed Question:', question); //  Logs the parsed question for debugging.
    console.log('Parsed Answer:', answer); // Logs the parsed answer for debugging.
 
    if (!question || !answer) { // If either the question or answer is missing, a 400 Bad Request response is sent back to the client
        return res.status(400).json({ error: 'Model could not generate a valid question. Please provide a clearer text.' });
    }

    currentQuestion = question.trim(); // Updates the variable with the trimmed question and answer.
    correctAnswer = answer.trim(); // 

    // Adds the generated question and answer to the context, which will be used in future API calls.
    context.push({ role: 'assistant', content: `Kysymys: ${currentQuestion}` });
    context.push({ role: 'assistant', content: `Vastaus: ${correctAnswer}` });

    res.json({ question: currentQuestion, answer: correctAnswer }); // Sends the question and answer back to the client as a JSON response.

        
    } catch (error) { // Catches any errors that occur during the fetch operation or processing of the response.
        console.error('Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/chat', async(req, res) => { // Defines a POST endpoint at the path /chat. req and res are the request and response objects
// The async keyword indicates that the function will handle asynchronous operations, such as API calls.
    const question = req.body.question; // The question from the client is extracted from req.body, which contains the JSON payload sent with the POST request.
    console.log(question); // debugging 

    /* palautetaan vastaus res.json käskyllä testivaiheessa kun luodaan yhteys frontilta serveriin ja takasin frontille:
    if (question) {
      res.json({ question: `Tämä on serverin palauttama viesti frontille: ${question}` });
    } else {
      res.status(400).json({ error: 'Kysymys puuttuu.' });
    } */

    try {
        // Generate the next question in Finnish using GPT-4
        const response = await fetch('https://api.openai.com/v1/chat/completions', { // sends a POST request to the OpenAI API endpoint.
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', // Specifies that the body of the request is in JSON format.
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` // Authenticates the request using an API key stored in an environment variable.
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini', // Specifies the model to use
                messages: [ // An array containing the conversation history, with the current question as the latest user message.
                    { role: 'user', content: question }
                ],
                max_tokens: 50
            })
        });

        const data = await response.json(); // Parses the JSON response from the API.
        console.log('API response:', data.choices[0].message.content); //  Logs the content of the first choice returned by the API.

        if (!data.choices || data.choices.length === 0) { //  if empty or not returned, an error is thrown.
            throw new Error('No choices returned from API');
        }

        const reply = data.choices[0].message.content; // extract the content of the reply from the response received from the OpenAI API
        res.json({ reply }); //  Sends the API's reply back to the client as a JSON object.

      } catch (error) { // Handles any errors that occur during the API request or response processing.
      console.error('Virheviesti:', error.message); // Logs the error message to the server console.
      res.status(500).json({ error: 'Internal Server Error' }); // response to the client with an error message.
      }

});

app.post('/check_answer', async(req, res) => { // Handles POST requests to the /check_answer endpoint.
    const userAnswer = req.body.user_answer; // The userAnswer is extracted from the request body, which is expected to be sent in JSON format.
    console.log(userAnswer); // debugging
    console.log(correctAnswer); // debugging


    try { // sends a POST request to the OpenAI API to generate a completion.
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', // Specify the content type as JSON
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` // Use the API key from environment variables
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [ // Set the system prompt to instruct the model, notice roles
                    { role: 'system', content: 'Olet aina ystävällinen opettaja joka arvioi oppilaan vastauksen kohteliaaseen sävyyn.' },
                    { role: 'assistant', content: `Kysymys: ${currentQuestion}` },
                    { role: 'assistant', content: `Oikea vastaus: ${correctAnswer}` },
                    { role: 'user', content: `Opiskelijan vastaus: ${userAnswer}` },
                    { role: 'system', content: 'Arvioi opiskelijan vastaus asteikolla 0-10 ja anna lyhyt selitys ystävällisin ja kannustavin sanoin.' }
                ],
                max_tokens: 50
            })
        });

        const data = await response.json(); // Parse the API response as JSON
        console.log('API response:', JSON.stringify(data)); // Log the full API response for debugging

        // Extract the evaluation from the API response
        const evaluation = data.choices[0].message.content.trim();
        console.log('Evaluation:', evaluation);

        // Send the evaluation back to the client as a JSON object
        res.json({ evaluation });

        } catch (error) { // Handle any errors that occur during the API call or processing
        console.error('Virheviesti:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/next-question', async (req, res) => { // Handles POST requests made to the /next-question endpoint.
    //console.log('Fetching next question');
  
    try {
  
        // Generate the next question in Finnish using GPT-4
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: context.concat([{ role: 'system', content: `Luo toinen yksinkertainen ja selkeä kysymys ja sen vastaus yllä olevasta tekstistä suomeksi: ${koealueTekstina}. Kysy vain yksi asia kerrallaan.` }]),
                max_tokens: 150
            })
        });

    const data = await response.json(); // Parse the response from the API as JSON.
    console.log('API response:', JSON.stringify(data, null, 2)); // Log the API response in a formatted JSON string.

    if (!data.choices || data.choices.length === 0 || !data.choices[0].message || !data.choices[0].message.content) {
        // Check if the response contains valid data:
        // - data.choices should exist and have at least one choice.
        // - The first choice should have a 'message' property with a 'content' field.
        throw new Error('No valid choices returned from API'); // If any condition fails, throw an error.
    }

    const responseText = data.choices[0].message.content.trim(); // Extract and trim the content of the message from the first choice.
    console.log('Response Text:', responseText); // Log the trimmed response text.

    const [question, answer] = responseText.includes('Vastaus:')
        ? responseText.split('Vastaus:') // If the text contains 'Vastaus:', split it into question and answer.
        : [responseText, null]; // If not, treat the entire responseText as the question, with no answer.

    console.log('Parsed Question:', question); // Log the parsed question.
    console.log('Parsed Answer:', answer); // Log the parsed answer

    if (!question || !answer) {
        // If either the question or answer is missing, return an error response.
        return res.status(400).json({ error: 'Model could not generate a valid question. Please provide a clearer text.' });
    }

    currentQuestion = question.trim(); // Update the current question by trimming any extra whitespace.
    correctAnswer = answer.trim(); // Update the correct answer by trimming any extra whitespace.

    // Update the conversation context with the new question and answer
    context.push({ role: 'assistant', content: `Kysymys: ${currentQuestion}` });
    context.push({ role: 'assistant', content: `Vastaus: ${correctAnswer}` });

    // Send the updated question and answer as a JSON response to the client.
    res.json({ question: currentQuestion, answer: correctAnswer });

    } catch (error) { // Catch any errors that occur during the process.
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
    }
});


// Start the server and listen for incoming requests on the specified port
app.listen(port, () => {
    // Log a message to the console indicating that the server is running and providing the URL to access it
    console.log(`Server running http://localhost:${port}`);
});
