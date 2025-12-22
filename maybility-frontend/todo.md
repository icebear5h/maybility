- Jounral View
    - connect electron system write and read to the actual file system

    - things to implement Electron embeds Node.js, which provides the fs module for accessing the local file system. The functions (e.g., fs.readFileSync(), fs.writeFileSync(), fs.mkdir()) work the same way in your JavaScript code regardless of the operating system. This allows you to maintain a single codebase for file operations. 

    - Solution: Always use the Node.js path module, specifically path.join(), to construct file paths. This module automatically uses the correct separator for the operating system your app is running on, ensuring cross-platform compatibility.

    File Permissions: Permissions work differently on Windows (ACLs) and macOS (POSIX), but Node.js fs operations generally abstract this away. If you encounter permission issues, ensure your application logic handles potential EACCES errors gracefully. 

    - Implement abstract relationship and line links in the journal view

- Calendar View
    - ensure that the post and updates work

- Goal view
    - ensure that the post and updates work
    - understand stage based goals,
    - assign stages to be a container for entries and tasks

- unification of color rendering on calendards and understanding time in different forms.