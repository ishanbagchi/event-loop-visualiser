import packageJson from '../../package.json'
import './Footer.css'

export const Footer = () => {
	return (
		<footer className="footer">
			<div className="footer-content">
				<div className="footer-links">
					<a
						href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop"
						target="_blank"
						rel="noopener noreferrer"
						className="footer-link"
					>
						📚 Event Loop Guide
					</a>
					<span className="footer-separator">•</span>
					<a
						href="https://github.com/ishanbagchi/event-loop-visualiser"
						target="_blank"
						rel="noopener noreferrer"
						className="footer-link"
					>
						⭐ Star on GitHub
					</a>
					<span className="footer-separator">•</span>
					<a
						href="https://javascript.info/event-loop"
						target="_blank"
						rel="noopener noreferrer"
						className="footer-link"
					>
						📖 JavaScript.info
					</a>
				</div>
				<span className="footer-credits">
					Built with ❤️ to help developers understand JavaScript
					internals
				</span>
				<span className="footer-version">v{packageJson.version}</span>
			</div>
		</footer>
	)
}
