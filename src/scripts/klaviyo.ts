import axios from "axios";
import { debugLog } from "./debug"

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const KLAVIYO_API_KEY = process.env.KLAVIYO_API_KEY;
const KLAVIYO_API_BASE_URL = "https://a.klaviyo.com/api/";
const KLAVIYO_API_REVISION = "2023-07-15";

// Generalized function to make server-side API calls to Klaviyo
const klaviyoRequest = async (method: HttpMethod, endpoint: string, params?: any, body?: any) => {
  debugLog("Making Klaviyo API request...");
  debugLog("method:", method);
  debugLog("endpoint:", endpoint);
  debugLog("params:", params);
  debugLog("body:", JSON.stringify(body, null, 2));

  try {
  const response = await axios({
    method: method,
    url: `${KLAVIYO_API_BASE_URL}${endpoint}`,
    headers: {
    'Authorization': `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
    'revision': KLAVIYO_API_REVISION,
    'accept': 'application/json'
    },
    params: params,
    data: body
  });
  debugLog("Klaviyo API Response Status:", response.status);
  return response.data;
  } catch (error) {
  console.error("Error when calling Klaviyo API:", error.response?.data || error.message);
  throw new Error(`Klaviyo API Error: ${error.response?.data?.message || error.message}`);
  }
};

// Return a list of all profiles in Klaviyo
export const getAllProfiles = () => klaviyoRequest('GET', 'profiles/');

// Return a single profile from Klaviyo using an email as input 
export const getProfileByEmail = (email: string) => klaviyoRequest('GET', `profiles?filter=equals(email,"${encodeURIComponent(email)}")`);

// Create a Profile with an input email
export const createProfile = (profileData: any) => klaviyoRequest('POST', 'profiles/', undefined, {
  data: {
    type: "profile",
    attributes: profileData
  }
});

// Create an Event (e.g. Placed Order)
export const createEvent = async (
  metricName: string, 
  email: any, 
  uniqueID: string,
  value: string, 
  properties: any
) => {
  const eventPayload = {
    data: {
      type: "event",
      attributes: {
        properties: properties,
        time: new Date().toISOString(),
        value: value,
        metric: {
          data: {
            type: "metric",
            attributes: {
              name: metricName
            }
          }
        },
        profile: {
          data: {
            type: "profile",
            attributes: {
              email: email
            }

          }
        },
        unique_id: uniqueID,
      }
    }
  };
  debugLog("Event request payload:", JSON.stringify(eventPayload, null, 2));
  return klaviyoRequest('POST', 'events/', undefined, eventPayload);
};
