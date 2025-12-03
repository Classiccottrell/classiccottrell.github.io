# ClassicCottrell Portfolio Site

A modern, component-based personal portfolio website for Matthew A. Cottrell, built with React and Vite. This project uses Storybook for UI component development and is deployed on Netlify.

---

## 🚀 URLs

- **Live Site:** [https://classiccottrell.github.io](https://classiccottrell.github.io)
- **Storybook:** [https://classiccottrell.github.io/storybook](https://classiccottrell.github.io/storybook)

---

## 🛠 Tech Stack

- **Framework:** [React](https://reactjs.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Component Library:** [Material-UI](https://mui.com/)
- **Component Development:** [Storybook](https://storybook.js.org/)
- **Deployment:** [Netlify](https://www.netlify.com/)

---

## 📁 Project Structure

```
classiccottrell.github.io/
│
├── src/
│   ├── ArtChart.jsx
│   └── main.jsx
├── stories/
│   ├── ArtCard.stories.js
│   ├── Colors.stories.js
│   └── Typography.stories.js
├── .storybook/
├── art.html
├── index.html
├── vite.config.js
├── package.json
└── netlify.toml
```

---

## ⚙️ Available Scripts

In the project directory, you can run:

- `npm run dev`: Runs the app in development mode with Vite.
- `npm run build`: Builds the app for production.
- `npm run storybook`: Starts the Storybook development server.
- `npm run build-storybook`: Builds Storybook for deployment.

---

## 🛠 Local Development

To get a local copy up and running, follow these steps:

### 1. Clone the repository:
```bash
git clone https://github.com/classiccottrell/classiccottrell.github.io.git
cd classiccottrell.github.io
```

### 2. Install NPM packages:
```bash
npm install
```

### 3. Start the development server:
```bash
npm run dev
```
Your site will be available at `http://localhost:5173` (or the next available port).

To view your components in Storybook, run:
```bash
npm run storybook
```

---

## 💾 Deployment

This site is automatically deployed via Netlify from the `main` branch. Pushing to `main` will trigger a new deployment.
