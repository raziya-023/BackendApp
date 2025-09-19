# VideoTweet - Backend API

This repository contains the backend server for the VideoTweet application, a full-stack video sharing platform. It is a RESTful API built with Node.js, Express, and MongoDB.

---

## Features

-   **Secure Authentication:** JWT-based authentication with access and refresh tokens stored in httpOnly cookies.
-   **RESTful Endpoints:** Complete CRUD operations for Users, Videos, Tweets, Comments, Subscriptions, and Playlists.
-   **Cloud Media Uploads:** Seamlessly handles video and image uploads to Cloudinary.
-   **Advanced Aggregation:** Powerful MongoDB aggregation pipelines for calculating dashboard stats and user channel data.

---

## API Endpoints

Here are some of the key public and protected routes:

| Method | Endpoint                             | Description                       | Protected |
| :----- | :----------------------------------- | :-------------------------------- | :-------- |
| `POST` | `/api/v1/users/register`             | Register a new user               | No        |
| `POST` | `/api/v1/users/login`                | Log in a user                     | No        |
| `POST` | `/api/v1/users/logout`               | Log out a user                    | Yes       |
| `GET`  | `/api/v1/videos`                     | Get all public videos             | Optional  |
| `POST` | `/api/v1/videos`                     | Upload a new video                | Yes       |
| `GET`  | `/api/v1/videos/:videoId`            | Get a single video's details      | Optional  |
| `DELETE`| `/api/v1/videos/:videoId`            | Delete a video                    | Yes       |
| `POST` | `/api/v1/likes/toggle/v/:videoId`    | Toggle a like on a video          | Yes       |
| `POST` | `/api/v1/subscriptions/c/:channelId` | Toggle a subscription to a channel | Yes       |
| `GET`  | `/api/v1/tweets`                     | Get all tweets (the feed)         | Yes       |
| `POST` | `/api/v1/tweets`                     | Create a new tweet                | Yes       |

---

## Environment Variables

To run this project, you will need to create a `.env` file in the root directory and add the following variables:

-   `PORT`
-   `MONGODB_URI`
-   `CORS_ORIGIN`
-   `ACCESS_TOKEN_SECRET`
-   `ACCESS_TOKEN_EXPIRY`
-   `REFRESH_TOKEN_SECRET`
-   `REFRESH_TOKEN_EXPIRY`
-   `CLOUDINARY_CLOUD_NAME`
-   `CLOUDINARY_API_KEY`
-   `CLOUDINARY_API_SECRET`

---

## Local Setup

1.  Clone the repository.
2.  Run `npm install` to install dependencies.
3.  Set up your `.env` file with the required variables.
4.  Run `npm run dev` to start the development server.
