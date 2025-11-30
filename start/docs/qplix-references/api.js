import fetch from "node-fetch";

// Data
const url = "https://smd43.qplix.com";
const F5Bearer =
  "m3brPHW19chc7Vr4Pd5LBaTmBQOLoIknjlW3pfG7UMzlaSJo22yXdJsKysorKCY5"; // Insert F5Bearer here or leave blank for localhost-requests
/* alternative should smd43 be down or something
const url = "https://smd44.qplix.com";
const F5Bearer = "OOjicO6FzfUbQK79QtF645DK2ybc7p2QUcq3VknHiHvvVw7NFabLYRkNA0q0N9LC";
*/

const QUserUsername = "qplix@qplix.com";
const QUserPassword = "Power4All";

const TokenUrl = url + "/Token";

async function getQplixData() {
  try {
    console.log("Starting Qplix API authentication...");

    // Request Q Bearer with Username+Password Login
    const body = `grant_type=password&username=${QUserUsername}&password=${QUserPassword}`;

    let tokenHeaders = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    if (F5Bearer) {
      tokenHeaders["Authorization"] = "Bearer " + F5Bearer;
    }

    const tokenResponse = await fetch(TokenUrl, {
      method: "POST",
      headers: tokenHeaders,
      body: body,
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token request failed! status: ${tokenResponse.status}`);
    }

    const responseData = await tokenResponse.json();
    const QBearer = responseData.access_token;

    console.log("Authentication successful, got Q Bearer token");

    // Assemble combined Bearer Header
    let apiHeaders = {
      Authorization: "Bearer " + QBearer,
      "Content-Type": "application/json",
    };

    if (F5Bearer) {
      apiHeaders["Authorization"] =
        "Bearer " + F5Bearer + ", Bearer " + QBearer;
    }

    // Make API request for user info
    // Hackathon Preset Performance Metrics:
    const urlUserInfo =
      url +
      "/qapi/v1/evaluation/preset/692b72137b0feeedcee7fbcb/legalEntity/5cb71a8b2c94de98b02aff19";

    // Other possible calls for different evaluations:
    // Hackathon Preset Time Series Classification Grouping: "/qapi/v1/evaluation/preset/691dd5953022610895c1aeff/legalEntity/5cb71a8b2c94de98b02aff19";
    // Hackathon Preset Time Series Security Grouping: "/qapi/v1/evaluation/preset/691dd48d3022610895c102ea/legalEntity/5cb71a8b2c94de98b02aff19";

    console.log("Fetching user data...");
    const userInfoResponse = await fetch(urlUserInfo, {
      method: "GET",
      headers: apiHeaders,
    });

    if (!userInfoResponse.ok) {
      throw new Error(
        `User info request failed! status: ${userInfoResponse.status}`,
      );
    }

    const result = await userInfoResponse.json();
    const lines = result.resultLine;

    // Output results
    console.log(
      `For '${result.resultLine.name}' the '${result.headers[3]}' from '${result.subHeaders[3][0]}' is '${result.resultLine.values[3].value}'`,
    );
    for (const subline of result.resultLine.subLines) {
      console.log(
        `For '${subline.name}' the '${result.headers[3]}' from '${result.subHeaders[3][0]}' is '${subline.values[3].value}'`,
      );
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Run the application
console.log("Qplix API Node.js App Started");
getQplixData();
