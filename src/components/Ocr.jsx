import React, { useState, useRef } from "react";
import "../App.css";
import SweetAlert2 from "react-sweetalert2";
import Features from "./Features";
import AlertComponent from "./Alert";
import { useApiService } from "../services/apiService";

function Ocr() {
  const apiService = useApiService();

  const [swalProps, setSwalProps] = useState({});
  const [uploadedFileData, setUploadedFileData] = useState([]);
  const [extractedTextData, setExtractedTextData] = useState(
    JSON.parse(localStorage.getItem("extractedTextData")) || []
  );
  const [errorAlert, setErrorAlert] = useState(null);

  const ocrStatus = {
    ready: { badgeColor: "info", badgeText: "ready" },
    processing: { badgeColor: "primary", badgeText: "processing" },
    completed: { badgeColor: "success", badgeText: "completed" },
    failed: { badgeColor: "danger", badgeText: "failed" },
  };

  const outputFormats = [
    { value: "text/plain", extension: "txt", label: "Text (.txt)" },
    { value: "application/pdf", extension: "pdf", label: "PDF (.pdf)" },
    {
      value:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      extension: "docx",
      label: "Word (.docx)",
    },
    {
      value: "application/msword",
      extension: "doc",
      label: "Word 97-2003 (.doc)",
    },
  ];

  const handleFileUpload = (event) => {
    const files = event.target.files;
    const fileObjects = [...files].map((file) => ({
      file: file,
      status: "ready",
      outputFormat: "",
    }));
    setUploadedFileData([...uploadedFileData, ...fileObjects]);
  };

  const selectOutputFormat = (event) => {
    const fileIndex = event.target.id;
    const selectedFormat = event.target.value;

    const newUploadedFileData = [...uploadedFileData];
    newUploadedFileData[fileIndex] = {
      ...newUploadedFileData[fileIndex],
      outputFormat: selectedFormat,
    };

    setUploadedFileData(newUploadedFileData);
  };

  const validateOcr = () => {
    const formatDropdowns = document.querySelectorAll(".output-formats");
    let allDropdownsFilled = true;

    formatDropdowns.forEach((element) => {
      if (element.value === "") {
        allDropdownsFilled = false;
        return;
      }
    });

    if (!allDropdownsFilled) {
      alert("Please select output format for all files before processing.");
    }

    return allDropdownsFilled;
  };

  const handleOcrRequest = async (uploadedFile) => {
    try {
      const response = await apiService.extractText(
        uploadedFile.file,
        uploadedFile.outputFormat
      );

      const original_file = response.original_file;
      const converted_file = response.converted_file;
      const extracted_text = response.extracted_text;
      const output_filename = converted_file.source_url.split("/").pop();

      console.log("response: ", response);

      return {
        originalFileName: original_file.filename,
        extractedText: extracted_text,
        outputFileName: output_filename,
        outputFileSize: converted_file.converted_size,
        outputFormat: uploadedFile.outputFormat,
        convertedFileUrl: converted_file.source_url,
        status: response.status,
      };
    } catch (error) {
      console.error("OCR error:", error);
      setErrorAlert({
        type: "error",
        title: "OCR Processing Failed",
        message:
          error.message ||
          "An error occurred while processing the file. Please try again.",
      });
      return {};
    }
  };

  const handleOcrProcessing = async () => {
    const isValid = validateOcr();

    if (!isValid) {
      return;
    }

    try {
      await Promise.all(
        uploadedFileData.map(async (uploadedFile, index) => {
          uploadedFile = {
            ...uploadedFile,
            status: "processing",
          };

          setUploadedFileData((prevUploadedFileData) => {
            const updatedUploadedFileData = [...prevUploadedFileData];
            updatedUploadedFileData[index] = uploadedFile;
            return updatedUploadedFileData;
          });

          const newExtractedTextData = await handleOcrRequest(uploadedFile);

          if (Object.keys(newExtractedTextData).length === 0) {
            uploadedFile = {
              ...uploadedFile,
              status: "failed",
            };

            setUploadedFileData((prevUploadedFileData) => {
              const updatedUploadedFileData = [...prevUploadedFileData];
              updatedUploadedFileData[index] = uploadedFile;
              return updatedUploadedFileData;
            });

            return;
          }

          setExtractedTextData((prevExtractedTextData) => [
            ...prevExtractedTextData,
            newExtractedTextData,
          ]);

          const extractedTextDataStorage =
            JSON.parse(localStorage.getItem("extractedTextData")) || [];
          const updatedExtractedTextData = [
            ...extractedTextDataStorage,
            newExtractedTextData,
          ];

          localStorage.setItem(
            "extractedTextData",
            JSON.stringify(updatedExtractedTextData)
          );

          setUploadedFileData((prevUploadedFileData) => {
            const updatedUploadedFileData = [...prevUploadedFileData];
            updatedUploadedFileData.splice(index, 1);
            return updatedUploadedFileData;
          });
        })
      );
    } catch (error) {
      console.error("Error in one or more OCR requests:", error);
      setErrorAlert({
        type: "error",
        title: "OCR Processing Error",
        message:
          error.message ||
          "One or more files failed to process. Please check your files and try again.",
      });
    }
  };

  const cancelUploadedFile = (index) => {
    setUploadedFileData((prevUploadedFileData) => {
      const updatedUploadedFileData = [...prevUploadedFileData];
      updatedUploadedFileData.splice(index, 1);
      return updatedUploadedFileData;
    });
  };

  const cancelExtractedTextData = (index) => {
    setExtractedTextData((prevExtractedTextData) => {
      const updatedExtractedTextData = [...prevExtractedTextData];
      updatedExtractedTextData.splice(index, 1);

      localStorage.setItem(
        "extractedTextData",
        JSON.stringify(updatedExtractedTextData)
      );

      return updatedExtractedTextData;
    });
  };

  const deleteAllData = () => {
    setUploadedFileData([]);
    setExtractedTextData([]);

    localStorage.removeItem("uploadedFileData");
    localStorage.removeItem("extractedTextData");
  };

  const truncateFilename = (filename, maxLength = 30) => {
    if (filename.length <= maxLength) return filename;
    return filename.substr(0, maxLength - 3) + "...";
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getFormatLabel = (mimeType) => {
    const format = outputFormats.find((f) => f.value === mimeType);
    return format ? format.extension : mimeType;
  };

  return (
    <>
      {errorAlert && (
        <AlertComponent
          type={errorAlert.type}
          title={errorAlert.title}
          message={errorAlert.message}
          onClose={() => setErrorAlert(null)}
        />
      )}
      <div className="content pb-5">
        <div className="content content-full">
          <div className="d-flex flex-column justify-content-sm-between text-center">
            <div className="flex-sm-fill font-size-h1 font-w700 text-center">
              <span className="text-primary">
                Optical Character Recognition (OCR). Online & Free
              </span>
            </div>
            <div>
              Convert Scanned Documents and Images into Editable Word, Pdf,
              Excel and Txt (Text) output formats
            </div>
          </div>
        </div>

        {uploadedFileData.length > 0 || extractedTextData.length > 0 ? (
          <div className="block block-rounded block-bordered">
            <div className="block-header block-header-default">
              <h3 className="block-title">OCR Processing</h3>
              <div className="block-options">
                <div className="block-options-item"></div>
              </div>
            </div>
            <div className="block-content">
              <table className="table table-vcenter">
                <thead>
                  <tr>
                    <th className="text-center">#</th>
                    <th>Name</th>
                    <th>Output Format</th>
                    <th className="d-none d-sm-table-cell">Status</th>
                    <th className="text-center">File Size</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadedFileData.map((fileObject, index) => (
                    <tr key={index}>
                      <td className="text-center" scope="row">
                        {index + 1}
                      </td>
                      <td className="font-w600">
                        <i className="fa fa-image mr-2"></i>
                        {truncateFilename(fileObject?.file?.name) || ""}
                      </td>
                      <td>
                        <select
                          className="form-control output-formats"
                          id={index}
                          style={{ width: "70%" }}
                          onChange={selectOutputFormat}
                        >
                          <option value="" required>
                            Select output format...
                          </option>
                          {outputFormats.map((format, formatIndex) => (
                            <option key={formatIndex} value={format.value}>
                              {format.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="d-none d-sm-table-cell">
                        <span
                          className={`badge badge-${
                            ocrStatus[fileObject.status].badgeColor
                          }`}
                        >
                          {fileObject.status}
                        </span>
                        {fileObject.status === "processing" && (
                          <span
                            className="spinner-border spinner-border-sm text-primary ml-2"
                            role="status"
                          >
                            <span className="sr-only">Loading...</span>
                          </span>
                        )}
                      </td>

                      <td className="text-center">
                        {`${fileObject?.file?.name
                          .split(".")
                          .pop()} / ${formatFileSize(fileObject.file.size)}`}
                      </td>

                      <td className="text-center">
                        <div className="btn-group">
                          <button
                            type="reset"
                            className="btn btn-sm btn-danger mr-1"
                            onClick={() => cancelUploadedFile(index)}
                          >
                            <i className="fa fa-fw fa-times"></i> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {extractedTextData.map((extractedData, index) => (
                    <tr key={index}>
                      <td className="text-center" scope="row">
                        {index + 1}
                      </td>
                      <td className="font-w600">
                        <i className="fa fa-file-text mr-2"></i>
                        {truncateFilename(extractedData?.outputFileName || "")}
                      </td>
                      <td>
                        <select
                          className="form-control output-formats"
                          id={index}
                          style={{ width: "70%" }}
                          disabled
                        >
                          <option>
                            {getFormatLabel(extractedData.outputFormat)}
                          </option>
                        </select>
                      </td>
                      <td className="d-none d-sm-table-cell">
                        <span
                          className={`badge badge-${
                            ocrStatus[extractedData?.status].badgeColor
                          }`}
                        >
                          {extractedData?.status}
                        </span>
                      </td>
                      <td className="text-center">
                        {`${getFormatLabel(extractedData.outputFormat)} / ${
                          extractedData.outputFileSize
                        }`}
                      </td>
                      <td className="text-center">
                        <div className="btn-group">
                          <button
                            type="reset"
                            className="btn btn-sm btn-danger mr-1"
                            onClick={() => cancelExtractedTextData(index)}
                          >
                            <i className="fa fa-fw fa-times"></i> Delete
                          </button>
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => {
                              if (extractedData.outputFormat === "text/plain") {
                                // For text files, download the extracted text
                                const blob = new Blob(
                                  [extractedData.extractedText],
                                  {
                                    type: extractedData.outputFormat,
                                  }
                                );
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = extractedData.outputFileName;
                                a.click();
                                URL.revokeObjectURL(url);
                              } else {
                                // For other formats, download the converted file from backend
                                const a = document.createElement("a");
                                a.href = extractedData.convertedFileUrl;
                                a.download = extractedData.outputFileName;
                                a.click();
                              }
                            }}
                          >
                            <i className="fa fa-fw fa-download"></i> Download
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="row block-content block-content-full block-content-sm bg-body-light">
              <div className="col text-left">
                <label htmlFor="upload-files" className="btn btn-primary">
                  <i className="fa fa-plus mr-2"></i> Add more files
                </label>
                <input
                  type="file"
                  id="upload-files"
                  onChange={handleFileUpload}
                  multiple
                  accept="image/*,.pdf"
                  required
                  hidden
                />
              </div>
              <div className="col text-right">
                <button
                  type="reset"
                  className="btn btn-danger mr-1"
                  onClick={() => deleteAllData()}
                >
                  <i className="fa fa-repeat"></i> Delete All
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  onClick={handleOcrProcessing}
                >
                  Extract Text <i className="fa fa-arrow-right ml-1"></i>
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {uploadedFileData.length === 0 && extractedTextData.length === 0 ? (
          <div className="d-flex justify-content-center">
            <div id="upload-file-block" className="block block-rounded">
              <div className="block-content">
                <div id="upload-file" className="text-center">
                  <label
                    htmlFor="id_original_file"
                    className="btn btn-hero-lg btn-hero-primary mb-3"
                  >
                    <i className="fa fa-upload mr-1" aria-hidden="true"></i>
                    Upload File
                  </label>
                  <input
                    type="file"
                    multiple
                    name="original_file"
                    required
                    id="id_original_file"
                    onChange={handleFileUpload}
                    accept="image/*,.pdf"
                    hidden
                  />
                  <p>
                    Upload your images or PDFs here, 100MB maximum file size.
                    <button
                      type="button"
                      className="btn btn-light"
                      onClick={() => {
                        setSwalProps({
                          show: true,
                          text: "All your data is always protected and under your control.",
                          icon: "info",
                        });
                      }}
                    >
                      <i className="fa fa-info-circle text-primary"></i>
                    </button>
                    <SweetAlert2
                      {...swalProps}
                      didClose={() => {
                        setSwalProps({});
                      }}
                    />
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <Features />
    </>
  );
}

export default Ocr;
