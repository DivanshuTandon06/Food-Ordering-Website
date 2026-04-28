Welcome to Food Heaven, a project designed to handle the core logic and security of a modern food-ordering application. This project was built to explore how a robust backend manages user identity, data security, and personalized profiles.

Overview
Food Heaven isn't just about listing meals; it’s about creating a secure environment for users to browse and order. The primary focus of this project was to implement a rock-solid authentication system and ensure that user data—especially sensitive information like passwords—is handled with industry-standard practices.

Key Features
Secure Authentication (JWT): We implemented JSON Web Tokens to handle user sessions. This allows for stateless authentication, meaning users stay logged in securely without the server needing to store every single session in a database.

Password Protection (bcrypt): Security is our priority. We use bcrypt for password hashing, ensuring that even if the database were compromised, user passwords remain encrypted and unreadable.

Personalized Profiles: Users can make the platform their own by uploading and updating Profile Pictures, adding a layer of personalization to the ordering experience.

Scalable Backend Logic: The architecture is designed to handle user requests efficiently, from logging in to managing profile data.

Tech Stack
Backend: Node.js & Express.js

Security: JWT (JSON Web Tokens) & bcrypt

Storage: (e.g., MongoDB/SQL) — Update this with your specific database!

File Handling: Multer (for profile picture uploads)
