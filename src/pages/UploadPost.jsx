import React, { useState } from 'react';
import { useParams } from 'react-router-dom';

const UploadPost = () => {
    const {communityId}=useParams();
    const [videoName, setVideoName] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState('');
    console.log(communityId);
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!file) {
            setMessage("Please select a file.");
            return;
        }

        if (file.size > 50 * 1024 * 1024) {
            setMessage("File exceeds the 50MB size limit.");
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        const metadata = {
            communityId: communityId,
            videoName: videoName,
            description: description
        };

        formData.append('metadata', JSON.stringify(metadata));
        console.log(metadata);
        try {
            const response = await fetch('http://localhost:8080/api/files/upload/post', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.text();  // Assuming backend returns a String message.
                setMessage(`Upload Successful: ${result}`);
            } else {
                const errorText = await response.text();
                setMessage(`Upload Failed: ${errorText}`);
            }
        } catch (error) {
            console.error('Error:', error);
            setMessage('An error occurred while uploading.');
        }
    };

    return (
        <div>
            <h2>Upload Video</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Video Name:</label>
                    <input
                        type="text"
                        value={videoName}
                        onChange={(e) => setVideoName(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Description:</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                    ></textarea>
                </div>
                <div>
                    <label>Select Video File:</label>
                    <input
                        type="file"
                        onChange={(e) => setFile(e.target.files[0])}
                        required
                    />
                </div>
                <button type="submit">Upload</button>
            </form>
            {message && <p>{message}</p>}
        </div>
    );
};

export default UploadPost;
