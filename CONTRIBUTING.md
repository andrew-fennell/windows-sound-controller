# Contributing to Windows Sound Controller

Thank you for considering contributing to this project! Here are some guidelines to help you get started.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:
- A clear title and description
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Your Windows version
- Screenshots if applicable

### Suggesting Features

Feature requests are welcome! Please create an issue with:
- A clear description of the feature
- Why you think it would be useful
- Any examples or mockups if applicable

### Pull Requests

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/windows-sound-profile-manager.git
cd windows-sound-profile-manager

# Install dependencies
npm install

# Run in development mode
npm start
```

### Code Style

- Use consistent indentation (2 spaces)
- Follow existing code patterns
- Comment complex logic
- Keep functions focused and modular

### Testing

Before submitting a PR:
- Test the application runs without errors
- Test all major features work
- Test on a clean Windows installation if possible
- Verify builds work: `npm run dist`

## Project Structure

- `src/` - Main application code
  - `main.js` - Electron main process
  - `preload.js` - IPC bridge
  - `renderer.js` - Frontend logic
  - `index.html` - UI markup
  - `styles.css` - Styling
- `scripts/` - PowerShell scripts for audio control
- `.github/workflows/` - GitHub Actions CI/CD

## Questions?

Feel free to open an issue for any questions or clarifications!
