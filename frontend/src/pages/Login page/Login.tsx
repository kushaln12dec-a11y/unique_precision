import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../services/api";
import { getHomePathForRole, getHomePathFromToken } from "../../utils/homeRoute";
import { getUserRoleFromToken, isTokenExpired, getDecodedTokenPayload, clearAuthSession } from "../../utils/auth";
import { companySlides } from "../../data/companySlides";
import { useCarousel } from "../../utils/useCarousel";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useTheme } from "../../theme/ThemeProvider";
import { getPublicLoginSlides } from "../../services/loginCmsApi";
import type { LoginSlide } from "../../types/loginCms";
import "./Login.css";

// Map static slides to LoginSlide shape for unified rendering
const staticSlidesAsLoginSlides: LoginSlide[] = companySlides.map((s, idx) => ({
  id: `static-${idx}`,
  title: s.title,
  subtitle: s.subtitle,
  content: s.content.join("\n"),
  highlight: s.highlight,
  isActive: true,
  sortOrder: idx,
}));

const Login = () => {
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const [empId, setEmpId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [cmsSlides, setCmsSlides] = useState<LoginSlide[]>(staticSlidesAsLoginSlides);

  // Redirect if already logged in with a valid token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const payload = getDecodedTokenPayload();
    if (!payload || isTokenExpired(payload)) {
      clearAuthSession();
      return;
    }
    navigate(getHomePathFromToken(), { replace: true });
  }, [navigate]);

  useEffect(() => {
    setTheme("light");
  }, [setTheme]);

  // Load CMS slides; fall back to static on error
  useEffect(() => {
    getPublicLoginSlides()
      .then((slides) => {
        if (slides && slides.length > 0) setCmsSlides(slides);
      })
      .catch(() => {/* keep static fallback */ });
  }, []);

  // Use carousel hook
  const {
    currentSlide,
    handleMouseDown,
    handleTouchStart,
    goToSlide,
    slideWrapperStyle,
  } = useCarousel({
    totalSlides: cmsSlides.length,
    threshold: 50,
    enableAutoPlay: true,
    autoPlayInterval: 5000,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await login(empId, password);
      const role =
        (result as { user?: { role?: string } })?.user?.role || getUserRoleFromToken();
      navigate(getHomePathForRole(role), { replace: true });
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
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
            {cmsSlides.map((slide) => {
              const lines = slide.content ? slide.content.split("\n").filter(Boolean) : [];
              const isGrid = lines.length > 8;
              return (
                <div key={slide.id} className="slide">
                  <div className="slide-content">
                    {slide.imageUrl && (
                      <img src={slide.imageUrl} alt="" className="slide-image" />
                    )}
                    <h2 className="slide-title">{slide.title}</h2>
                    {slide.subtitle && <p className="slide-subtitle">{slide.subtitle}</p>}
                    {isGrid ? (
                      <div className="facilities-grid">
                        <ul className="slide-list slide-list-left">
                          {lines.slice(0, 8).map((item, idx) => (
                            <li key={idx} className="slide-item">
                              <span className="bullet-icon">→</span>
                              <span>
                                {item.includes(":") ? (
                                  <><span className="highlight-label">{item.split(":")[0]}:</span>{item.substring(item.indexOf(":") + 1)}</>
                                ) : item}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <ul className="slide-list slide-list-right">
                          {lines.slice(8).map((item, idx) => (
                            <li key={idx} className="slide-item">
                              <span className="bullet-icon">→</span>
                              <span>
                                {item.includes(":") ? (
                                  <><span className="highlight-label">{item.split(":")[0]}:</span>{item.substring(item.indexOf(":") + 1)}</>
                                ) : item}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <ul className="slide-list">
                        {lines.map((item, idx) => (
                          <li key={idx} className="slide-item">
                            <span className="bullet-icon">→</span>
                            <span>
                              {item.includes(":") ? (
                                <><span className="highlight-label">{item.split(":")[0]}:</span>{item.substring(item.indexOf(":") + 1)}</>
                              ) : item}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {slide.highlight && <p className="slide-highlight">{slide.highlight}</p>}
                    {slide.buttonLabel && slide.buttonUrl && (
                      <a href={slide.buttonUrl} target="_blank" rel="noreferrer" className="slide-cta-btn">
                        {slide.buttonLabel}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation Dots */}
        <div className="slide-indicators">
          {cmsSlides.map((_, index) => (
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
          <div className="logo-container">
            <img src="/output-onlinepngtools.svg" alt="Unique Precision Logo" className="login-logo" />
            <div className="login-brand-name" aria-label="Unique Precision">
              <span className="login-brand-line">Unique</span>
              <span className="login-brand-line">Precision</span>
            </div>
          </div>
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">Sign in to access your account</p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="empId" className="form-label">
                Employee ID
              </label>
              <input
                id="empId"
                type="text"
                className="form-input"
                placeholder="Enter your employee ID (e.g. EMP0001)"
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                required
                autoComplete="username"
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
