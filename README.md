# IFC Regex Visualizer 🎨

[![Live Demo](https://img.shields.io/badge/▶️%20Live%20Demo-ifc--regex.vercel.app-0055FF?style=for-the-badge&logo=vercel&logoColor=white)](https://ifc-regex.vercel.app/)

A weekend project born from curiosity about parsing IFC (Industry Foundation Classes) files with regex. Instead of keeping it simple, I went down the rabbit hole and made an interactive visualizer because... why not? 🕳️🐇

## What's This?

It's a little web app that shows you how regex patterns work by visualizing them. I started with the idea of parsing IFC files client-side using regex (probably not the best idea, but hey, it's fun to experiment!).

## Features

- See your regex patterns come to life with D3.js visualizations
- Real-time updates as you type
- Pretty colors and animations because they make everything better
- Built with Next.js + TypeScript + Tailwind because that's what the cool kids use these days

## Try It Out

1. Clone this experiment:
   ```bash
   git clone https://github.com/your-username/ifc-regex.git
   cd ifc-regex
   ```

2. Install stuff:
   ```bash
   npm install
   ```

3. Run it:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) and play around!

## Tech Stack

- Next.js 15.0 (with Turbopack because fast is good)
- TypeScript (because types are nice)
- D3.js (for the pretty visualizations)
- Tailwind CSS (for quick and dirty styling)

## Development

This is very much a "Sunday night special" - feel free to fork it, break it, or make it better! The interesting bits are in:
- `src/components/ParsingVisualizer.tsx`: Where the magic happens
- `src/app/page.tsx`: The main page

## Learn More

If you're interested in the tech used here:
- [Next.js](https://nextjs.org/docs)
- [D3.js](https://d3js.org/)

Or if you want to learn about proper IFC parsing, maybe don't use regex 😅
