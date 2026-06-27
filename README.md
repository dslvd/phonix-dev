# 🦅 Phonix — Learn Beyond Language Barriers

![Phonix Banner](./assets/screenshots/banner.png)

Phonix is an AI-powered language learning app built as an alternative to tools like Duolingo. Instead of static, one-size-fits-all lessons, Phonix uses the **Google Gemini 2.5 Flash API** to dynamically generate lesson content based on each user's current skill level. Whether you're a complete beginner or already conversational, the app adapts to where you are and builds from there — covering vocabulary, grammar, and reading comprehension in a way that feels personal rather than repetitive.

One of Phonix's standout features is **Scan Mode**, powered by the **Google Vision API**. Users can point their camera at any real-world text — a menu, a sign, a product label — and the app will detect, translate, and break down what's on screen. It's a way to turn everyday life into a learning opportunity without switching apps or looking anything up manually.

On the technical side, Phonix is built with **React** and **TypeScript**, styled using **Tailwind CSS**, and uses **OAuth** for secure user authentication. All user data, progress, and lesson history are stored in **Cloudflare D1**, a serverless SQLite database that runs at the edge for fast, reliable access.

## Tech Stack

| | |
|---|---|
| **Frontend** | React, TypeScript, Tailwind CSS |
| **AI** | Google Gemini API 2.5 Flash |
| **Computer Vision** | Google Vision API |
| **Auth** | OAuth |
| **Database** | Cloudflare D1 |
