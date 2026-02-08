import { tool } from "ai";
import { z } from "zod";

/**
 * TODO: Implement the weather data tool
 *
 * This tool should:
 * 1. Accept parameters for location, forecast days, and weather variables
 * 2. Use the Open-Meteo API to fetch weather forecast data
 * 3. Return structured weather data that the LLM can use to answer questions
 *
 * Open-Meteo API docs: https://open-meteo.com/en/docs
 * Base URL: https://api.open-meteo.com/v1/forecast
 *
 * Example API call:
 *   https://api.open-meteo.com/v1/forecast?latitude=35.6762&longitude=139.6503&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=3
 *
 * Steps to implement:
 *   a. Define the tool parameters schema using Zod:
 *      - latitude (number, required): Latitude of the location
 *      - longitude (number, required): Longitude of the location
 *      - forecast_days (number, optional, default 3): Number of days to forecast (1-7)
 *      - daily (array of strings, optional): Weather variables to include
 *        Useful variables: temperature_2m_max, temperature_2m_min,
 *        precipitation_sum, windspeed_10m_max, weathercode
 *
 *   b. Make a fetch request to the Open-Meteo API with the parameters
 *
 *   c. Parse the JSON response and return it
 *
 *   d. Handle errors:
 *      - API errors (non-200 status)
 *      - Network failures
 *      - Invalid response format
 *
 * Hints:
 *   - The LLM will provide latitude/longitude — you can trust it to geocode city names
 *   - Open-Meteo is free and requires no API key
 *   - Keep the return format simple — the LLM will format it for the user
 */

const DEFAULT_DAILY_VARS = [
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "windspeed_10m_max",
  "weathercode",
] as const;

export const weatherTool = tool({
  description:
    "Get weather forecast data for a location. Use this when the user asks about weather, temperature, rain, wind, or forecasts for any location.",
  parameters: z.object({
    latitude: z
      .number()
      .min(-90)
      .max(90)
      .describe("Latitude of the location in decimal degrees (-90 to 90)."),
    longitude: z
      .number()
      .min(-180)
      .max(180)
      .describe(
        "Longitude of the location in decimal degrees (-180 to 180)."
      ),
    forecast_days: z
      .number()
      .int()
      .min(1)
      .max(7)
      .default(3)
      .describe("Number of days to forecast (1–7). Defaults to 3."),
    daily: z
      .array(
        z.enum([
          "temperature_2m_max",
          "temperature_2m_min",
          "precipitation_sum",
          "windspeed_10m_max",
          "weathercode",
        ])
      )
      .optional()
      .describe(
        "Daily weather variables to include. Defaults to a useful set of common variables."
      ),
  }),
  execute: async ({ latitude, longitude, forecast_days = 3, daily }) => {
    try {

      const dailyVars =
        daily && daily.length > 0
          ? daily
          : (DEFAULT_DAILY_VARS as unknown as string[]);

      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        forecast_days: forecast_days.toString(),
        timezone: "auto",
        daily: dailyVars.join(","),
      });

      const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Weather API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      return {
        source: "open-meteo",
        query: {
          latitude,
          longitude,
          forecast_days,
          daily: dailyVars,
        },
        units: data.daily_units ?? null,
        daily: data.daily ?? null,
      };
    } catch (error) {
      console.error("Weather tool error:", error);
      return {
        error:
          error instanceof Error
            ? error.message
            : "Checking weather failed due to an unknown error.",
      };
    }
  },
});
