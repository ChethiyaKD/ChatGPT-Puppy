const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors({}));
app.use(express.json());

app.post('/', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await getResp(prompt);
    res.status(200).json({ response });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

const userAgent = require('user-agents');
const puppeteer = require('puppeteer-extra')

const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const getResp = async (inputPrompts) => {
    return new Promise(async (resolve, reject) => {
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();

        await page.setUserAgent(userAgent.random().toString());
        await page.goto('https://chat.openai.com');

        await page.waitForSelector('#prompt-textarea');

        await page.exposeFunction('logToConsole', (message) => {
            console.log(message);
            resolve(message);
        });

        // Run JavaScript on the webpage once the page is fully loaded
        await page.evaluate((prompt) => {
            const waitForTheResponse = () => {
                setTimeout(() => {
                    const userMessageSelector = 'div[data-message-author-role="user"]';
                    const responseSelector = 'div[data-message-author-role="assistant"]';

                    const timer = setInterval(() => {
                        const conversationTurns = document.querySelectorAll('[data-testid^="conversation-turn-"]');
                        const stopButton = document.querySelector('button[aria-label="Stop generating"]');
                        if (stopButton) return;

                        const lastConversationItem = conversationTurns[conversationTurns.length - 1];
                        const isResponse = lastConversationItem.querySelector(responseSelector);

                        if (!isResponse) return;

                        clearInterval(timer);
                        window.logToConsole(isResponse.textContent);
                    }, 300);
                }, 2000);
            };

            const timer = setInterval(() => {
                const input = document.querySelector("#prompt-textarea");
                const sendButton = document.querySelector('[data-testid="send-button"]');

                if (!input) return;

                clearInterval(timer); // Stop the interval once the input is found
                console.log("PROMPT IS: ", prompt);
                input.value = prompt;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                setTimeout(() => {
                    sendButton?.click();
                }, 1000);

                waitForTheResponse();
            }, 300);
        }, inputPrompts); // Pass inputPrompts here
    });
}
