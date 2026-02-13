// using CommonJS for compatibility without package.json
module.exports = function (req, res) {
    // SECURITY: Restrict access to your own domain?
    // Start with '*' for development, lock down to your Vercel URL later.
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Return the config from environment variables
    res.status(200).json({
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID
    });
}
