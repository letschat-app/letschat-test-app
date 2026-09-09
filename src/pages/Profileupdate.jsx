import React, { useState } from "react";

const Profileupdate = () => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return setStatus("Please select a file.");

    if (file.size > 50 * 1024 * 1024) {
      return setStatus("File exceeds the 50MB size limit.");
    }

    const formData = new FormData();
    formData.append("file", file);
    console.log(formData.get(file))
    const id=localStorage.getItem("userid")
    try {
      const res = await fetch(`http://localhost:8080/api/user/profile/${id}`, {
        
        method: "POST",
        body: formData,
      });

      const text = await res.text();
      setStatus(text);
    } catch (err) {
      console.error(err);
      setStatus("Upload failed.");
    }
  };

  return (
    <div className="p-4">
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
      <p>{status}</p>
    </div>
  );
};

export default Profileupdate;
