import "./AppLoader.css";

type AppLoaderProps = {
  message?: string;
  variant?: "inline" | "panel" | "overlay";
};

const AppLoader = ({
  message = "Loading...",
  variant = "panel",
}: AppLoaderProps) => {
  return (
    <div className={`app-loader app-loader-${variant}`} role="status" aria-live="polite">
      <div className="app-loader-mark">
        <img
          src="/output-onlinepngtools.svg"
          alt="Unique Precision loader"
          className="app-loader-logo"
        />
      </div>
      <p className="app-loader-message">{message}</p>
    </div>
  );
};

export default AppLoader;
