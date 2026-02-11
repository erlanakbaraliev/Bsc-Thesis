# Official Thesis Description: Web App for Managing Fixed Income Bond Data
The goal of this thesis is to develop a web-based application that helps fixed income teams manage and analyze bond data more efficiently. In many financial
organizations, bond information is still maintained manually using spreadsheets, leading to data errors, duplication, and limited collaboration. This project addresses those
issues by providing a centralized and user-friendly platform where users can upload bond data through CSV files, have it validated, and store it securely in a structured
database. The system aims to streamline daily workflows and reduce the reliance on manual spreadsheet management.
Users begin by uploading bond data in CSV format, which is parsed, validated, and saved in the database. The application allows users to view bond records in a
paginated table, with options to search, filter, edit, and delete entries. New bonds can also be added manually, and all data can be exported back to CSV format. To
support collaboration and data integrity, the system includes user registration, login, and role-based access control. These features ensure that only authorized users can
access or modify sensitive bond data.
The system is developed using Django and adheres to best practices, including form validation, error handling, and clean separation of logic via the Model-View-
Template architecture. Development tools such as Docker, Pylint, automated testing, and CI pipelines are integrated to ensure code quality, maintainability, and
scalability. With further expansion this application could be adopted as a practical solution for real-world finance teams managing fixed income data.
