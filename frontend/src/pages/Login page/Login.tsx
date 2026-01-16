import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../services/api";
import { companySlides } from "../../data/companySlides";
import { useCarousel } from "../../utils/useCarousel";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import "./Login.css";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/dashboard");
    }
  }, [navigate]);

  // Use carousel hook
  const {
    currentSlide,
    handleMouseDown,
    handleTouchStart,
    goToSlide,
    slideWrapperStyle,
  } = useCarousel({
    totalSlides: companySlides.length,
    threshold: 50,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await login(email, password);
      // Redirect to dashboard on successful login
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Left Side - Company Info with Carousel */}
      <div className="company-section">
        <div className="slide-container">
          <div
            className="slide-wrapper"
            style={slideWrapperStyle}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            {companySlides.map((slide, index) => (
              <div key={index} className="slide">
                <div className="slide-content">
                  <h2 className="slide-title">{slide.title}</h2>
                  <p className="slide-subtitle">{slide.subtitle}</p>
                  {index === 1 ? (
                    // Facilities section - two columns
                    <div className="facilities-grid">
                      <ul className="slide-list slide-list-left">
                        {slide.content.slice(0, 8).map((item, idx) => (
                          <li key={idx} className="slide-item">
                            <span className="bullet-icon">→</span>
                            <span>
                              {item.includes(":") ? (
                                <>
                                  <span className="highlight-label">
                                    {item.split(":")[0]}:
                                  </span>
                                  {item.substring(item.indexOf(":") + 1)}
                                </>
                              ) : (
                                item
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <ul className="slide-list slide-list-right">
                        {slide.content.slice(8, 16).map((item, idx) => (
                          <li key={idx} className="slide-item">
                            <span className="bullet-icon">→</span>
                            <span>
                              {item.includes(":") ? (
                                <>
                                  <span className="highlight-label">
                                    {item.split(":")[0]}:
                                  </span>
                                  {item.substring(item.indexOf(":") + 1)}
                                </>
                              ) : (
                                item
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <ul className="slide-list">
                      {slide.content.map((item, idx) => (
                        <li key={idx} className="slide-item">
                          <span className="bullet-icon">→</span>
                          <span>
                            {item.includes(":") ? (
                              <>
                                <span className="highlight-label">
                                  {item.split(":")[0]}:
                                </span>
                                {item.substring(item.indexOf(":") + 1)}
                              </>
                            ) : (
                              item
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {slide.highlight && (
                    <p className="slide-highlight">{slide.highlight}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Dots */}
        <div className="slide-indicators">
          {companySlides.map((_, index) => (
            <button
              key={index}
              className={`indicator ${index === currentSlide ? "active" : ""}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="login-section">
        <div className="login-form-container">
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">Sign in to access your account</p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <VisibilityOffIcon fontSize="small" />
                  ) : (
                    <VisibilityIcon fontSize="small" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className={`login-button ${isLoading ? "loading" : ""}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;