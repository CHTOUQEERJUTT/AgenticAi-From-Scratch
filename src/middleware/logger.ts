import logger from "../utils/logger";
import morgan from 'morgan'

const skip= () => {
    const env = process.env.NODE_ENV || "development";
    return env === "test";
}
const stream = {
  write: (message: string) => logger.info(message.trim(), { logType: 'http' }),
};
export const morganMiddleware = morgan(
  ":method :url :status :res[content-length] - :response-time ms",
  { stream }
);