import React, { useState, useEffect, useRef } from "react";
import "../App.css";
import SweetAlert2 from "react-sweetalert2";
import Features from "./Features";
import { useApiService } from "../services/apiService";
import { getFileDownloadUrl } from "../services/s3Service";

function FileConversion(props) {
  const apiService = useApiService();

  const fileType = props.fileType;

  const [swalProps, setSwalProps] = useState({});
  const [uploadedFileData, setUploadedFileData] = useState([]);
  const [convertedFileData, setConvertedFileData] = useState(
    JSON.parse(localStorage.getItem("convertedFilesData")) || []
  );
  const [supportedConversions, setSupportedConversions] = useState(
    JSON.parse(localStorage.getItem("supportedConversions")) || {}
  );

  const fetchedRef = useRef(false);

  const conversionStatus = {
    ready: { badgeColor: "info", badgeText: "ready" },
    processing: { badgeColor: "primary", badgeText: "processing" },
    completed: { badgeColor: "success", badgeText: "completed" },
    failed: { badgeColor: "danger", badgeText: "failed" },
  };

  useEffect(() => {
    const isEmpty = Object.keys(supportedConversions).length === 0;

    if (isEmpty) {
      fetchSupportedMimetypes();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "supportedConversions",
      JSON.stringify(supportedConversions)
    );
  }, [supportedConversions]);

  const fetchSupportedMimetypes = async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    try {
      const data = await apiService.fetchSupportedMimetypes();
      setSupportedConversions(data.supported_conversions);
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  const handleFileUpload = (event) => {
    const files = event.target.files;
    const fileObjects = [...files].map((file) => ({
      file: file,
      status: "ready",
    }));
    setUploadedFileData([...uploadedFileData, ...fileObjects]);
  };

  const selectSupportedConversion = (event) => {
    console.log("event: ", event);
    const conversionIndex = event.target.id;
    const selectedTargetMimetype = event.target.value;

    const newUploadedFileData = [...uploadedFileData];
    newUploadedFileData[conversionIndex] = {
      ...newUploadedFileData[conversionIndex],
      targetMimetype: selectedTargetMimetype,
    };

    setUploadedFileData(newUploadedFileData);
  };

  const validateConversion = () => {
    const supportedConversionDropdowns =
      document.querySelectorAll(".target-mimetypes");
    let allDropdownsFilled = true;

    supportedConversionDropdowns.forEach((element) => {
      if (element.value === "") {
        allDropdownsFilled = false;
        return; // Stop iterating if any dropdown is not filled
      }
    });

    if (!allDropdownsFilled) {
      alert("Please fill in all dropdowns before conversion.");
    }

    return allDropdownsFilled;
  };

  const handleConversionRequest = async (uploadedConversion) => {
    try {
      const response = await apiService.convertFile(
        uploadedConversion.file,
        uploadedConversion.targetMimetype
      );

      console.log("response: ", response);

      const original_file = response.original_file;
      const converted_file = response.converted_file;
      const converted_filename = converted_file.source_url.split("/").pop();
      const converted_file_download_url = await getFileDownloadUrl(
        converted_filename
      );

      return {
        originalFileName: original_file.fileName,
        convertedFileDownloadUrl: converted_file_download_url,
        convertedFileName: converted_filename,
        convertedFileSize: converted_file.converted_size,
        status: response.status,
      };
    } catch (error) {
      console.error("Conversion error:", error);
      return {};
    }
  };

  const handleConversion = async () => {
    const isValid = validateConversion();

    if (!isValid) {
      return;
    }

    try {
      await Promise.all(
        uploadedFileData.map(async (uploadedConversion, index) => {
          uploadedConversion = {
            ...uploadedConversion,
            status: "processing",
          };

          setUploadedFileData((prevUploadedFileData) => {
            const updatedUploadedFileData = [...prevUploadedFileData];
            updatedUploadedFileData[index] = uploadedConversion;
            return updatedUploadedFileData;
          });

          const newConvertedFileConversion = await handleConversionRequest(
            uploadedConversion
          );

          if (Object.keys(newConvertedFileConversion).length === 0) {
            uploadedConversion = {
              ...uploadedConversion,
              status: "failed",
            };

            setUploadedFileData((prevUploadedFileData) => {
              const updatedUploadedFileData = [...prevUploadedFileData];
              updatedUploadedFileData[index] = uploadedConversion;
              return updatedUploadedFileData;
            });

            return;
          }

          setConvertedFileData((prevConvertedFileData) => [
            ...prevConvertedFileData,
            newConvertedFileConversion,
          ]);

          const convertedFilesData =
            JSON.parse(localStorage.getItem("convertedFilesData")) || [];
          const updatedConvertedFilesData = [
            ...convertedFilesData,
            newConvertedFileConversion,
          ];

          localStorage.setItem(
            "convertedFilesData",
            JSON.stringify(updatedConvertedFilesData)
          );

          // Remove uploadedFileData conversion at index
          setUploadedFileData((prevUploadedFileData) => {
            const updatedUploadedFileData = [...prevUploadedFileData];
            updatedUploadedFileData.splice(index, 1);
            return updatedUploadedFileData;
          });
        })
      );
    } catch (error) {
      console.error("Error in one or more requests:", error);
    }
  };

  const cancelUploadedFileConversion = (index) => {
    setUploadedFileData((prevUploadedFileData) => {
      const updatedUploadedFileData = [...prevUploadedFileData];
      updatedUploadedFileData.splice(index, 1);

      localStorage.setItem(
        "uploadedFileData",
        JSON.stringify(updatedUploadedFileData)
      );

      return updatedUploadedFileData;
    });
  };

  const cancelConvertedFileConversion = (index) => {
    setConvertedFileData((prevConvertedFileData) => {
      const updatedConvertedFilesData = [...prevConvertedFileData];
      updatedConvertedFilesData.splice(index, 1);

      localStorage.setItem(
        "convertedFilesData",
        JSON.stringify(updatedConvertedFilesData)
      );

      return updatedConvertedFilesData;
    });
  };

  const deleteConversionData = () => {
    setUploadedFileData([]);
    setConvertedFileData([]);

    localStorage.removeItem("uploadedFileData");
    localStorage.removeItem("convertedFilesData");
  };

  const supportedConversionsOfUploadedFile = (fileObject) => {
    const conversions = supportedConversions;

    if (!fileObject?.file) return "";

    const fileType = fileObject.file.type;
    const fileName = fileObject.file.name.split(".").pop();

    if (fileType && conversions[fileType]) {
      return fileType;
    }

    for (const key in conversions) {
      if (key.toLowerCase().split("/").pop() == fileName.toLowerCase()) {
        return key;
      }
    }

    for (const key in conversions) {
      if (key.toLowerCase().includes(fileName.toLowerCase())) {
        return key;
      }
    }

    return "";
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

  return (
    <>
      <div className="content pb-5">
        <div className="content content-full">
          <div className="d-flex flex-column justify-content-sm-between text-center">
            <div className="flex-sm-fill font-size-h1 font-w700 text-center">
              <span className="text-dark">{fileType ? fileType : "File"}</span>
              <span className="text-primary"> Converter</span>
            </div>
            <div>Convert your files to any format</div>
          </div>
        </div>

        {uploadedFileData.length > 0 || convertedFileData.length > 0 ? (
          <div className="block block-rounded block-bordered">
            <div className="block-header block-header-default">
              <h3 className="block-title">{fileType} Conversions</h3>
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
                    <th>Supported Conversions</th>
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
                          className="form-control target-mimetypes"
                          id={index}
                          style={{ width: "70%" }}
                          onChange={selectSupportedConversion}
                        >
                          <option value="" required>
                            Convert to format ...
                          </option>
                          {supportedConversions[
                            supportedConversionsOfUploadedFile(fileObject)
                          ]?.targetable_mimetypes?.map(
                            (target_mimetype, index) => (
                              <option key={index} value={target_mimetype}>
                                {
                                  supportedConversions[target_mimetype]
                                    ?.extension
                                }
                              </option>
                            )
                          )}
                        </select>
                      </td>
                      <td className="d-none d-sm-table-cell">
                        <span
                          className={`badge badge-${
                            conversionStatus[fileObject.status].badgeColor
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
                        {formatFileSize(fileObject.file.size)}
                      </td>

                      <td className="text-center">
                        <div className="btn-group">
                          <button
                            type="reset"
                            className="btn btn-sm btn-danger mr-1"
                            onClick={() => cancelUploadedFileConversion(index)}
                          >
                            <i className="fa fa-fw fa-times"></i> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {convertedFileData.map((convertedConversion, index) => (
                    <tr key={index}>
                      <td className="text-center" scope="row">
                        {index + 1}
                      </td>
                      <td className="font-w600">
                        <i className="fa fa-image mr-2"></i>
                        {truncateFilename(
                          convertedConversion?.convertedFileName || ""
                        )}
                      </td>
                      <td>
                        <select
                          className="form-control target-mimetypes"
                          id={index}
                          style={{ width: "70%" }}
                          disabled
                        >
                          <option>
                            {convertedConversion.convertedFileName
                              .split(".")
                              .pop()}
                          </option>
                        </select>
                      </td>
                      <td className="d-none d-sm-table-cell">
                        <span
                          className={`badge badge-${
                            conversionStatus[convertedConversion?.status]
                              .badgeColor
                          }`}
                        >
                          {convertedConversion?.status}
                        </span>
                      </td>
                      <td className="text-center">
                        {convertedConversion.convertedFileSize}
                      </td>
                      <td className="text-center">
                        <div className="btn-group">
                          <button
                            type="reset"
                            className="btn btn-sm btn-danger mr-1"
                            onClick={() => cancelConvertedFileConversion(index)}
                          >
                            <i className="fa fa-fw fa-times"></i> Delete
                          </button>
                          <a
                            href={convertedConversion.convertedFileDownloadUrl}
                            className="btn btn-sm btn-success"
                            target="_blank"
                            download={convertedConversion?.convertedFileName}
                          >
                            <i className="fa fa-fw fa-download"></i> Download
                          </a>
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
                  required
                  hidden
                />
              </div>
              <div className="col text-right">
                <button
                  type="reset"
                  className="btn btn-danger mr-1"
                  onClick={() => deleteConversionData()}
                >
                  <i className="fa fa-repeat"></i> Delete All
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  onClick={handleConversion}
                >
                  Convert All <i className="fa fa-arrow-right ml-1"></i>
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {uploadedFileData.length === 0 && convertedFileData.length === 0 ? (
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
                    hidden
                  />
                  <p>
                    Upload your files here, 100MB maximum file size.
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

export default FileConversion;
