# CubeFlow Timer

System Role & Objective:

You are an expert Web Developer specializing in React, Three.js, and Speedcubing software. Build a single-page web application that serves as a 3D Virtual Cube Simulator and a WCA Speedcubing Timer.

Tech Stack: React, Tailwind CSS, @react-three/fiber / @react-three/drei (or cubing.js / Three.js), and Lucide-React for icons.

Core Features & Functionality:

3D Interactive Virtual Cube:

Render an interactive 3D 3x3 Rubik's Cube with smooth face-turning animations and 360-degree camera rotation.

Keyboard controls mapping standard WCA notation (U, D, L, R, F, B, plus Shift for prime ' moves).

Functional Scramble, Reset, and Solve buttons (using an algorithmic solver or step-by-step auto-solve).

Full-Featured WCA Speedcubing Timer:

Spacebar Hold Mechanics: Hold Space (or tap-and-hold on mobile) until the display turns green, then release to start. Press any key or tap to stop.

Official Scrambles: Display a generated WCA scramble string for the active puzzle. Sync the scramble directly to the 3D cube model.

Session Stats: Track solve history, Best Time, Worst Time, Ao5 (Average of 5), and Ao12.

Penalty Options: Allow flagging solves as +2, DNF, or deleting them from the list.

Multi-WCA Event Support:

Event selector for 2x2, 3x3, 4x4, 5x5, Pyraminx, Megaminx, Skewb, and Square-1.

Switching events updates the scramble generator and resets the timer session for that category.

UI/UX Design:

Modern, dark-mode speedcubing dashboard.

Desktop layout: Split view with the 3D Cube viewer on the left and Timer + Stats on the right. Mobile layout: Tabbed toggles between "Play Cube" and "Timer".

Output Required:

Clean, modular, fully production-ready React code (split into component files or a single self-contained app file).

Complete list of required npm dependencies.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://speed-cube-sync.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e9310a89-4d29-4504-adaf-2b16f325323f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
