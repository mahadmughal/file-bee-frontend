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
  const [conversionData, setConversionData] = useState([]);
  const [supportedConversions, setSupportedConversions] = useState({});

  const fetchedRef = useRef(false);

  const conversionStatus = {
    ready: { badgeColor: "info", badgeText: "ready" },
    processing: { badgeColor: "primary", badgeText: "processing" },
    completed: { badgeColor: "success", badgeText: "completed" },
    failed: { badgeColor: "danger", badgeText: "failed" },
  };

  useEffect(() => {
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

    fetchSupportedMimetypes();
  }, []);

  const handleFileUpload = (event) => {
    const files = event.target.files;
    const fileObjects = [...files].map((file) => ({
      file: file,
      status: "ready",
    }));
    setConversionData([...conversionData, ...fileObjects]);
  };

  const selectSupportedConversion = (event) => {
    console.log("event: ", event);
    const conversionIndex = event.target.id;
    const selectedConversion = event.target.value;

    const newConversionData = [...conversionData];
    newConversionData[conversionIndex] = {
      ...newConversionData[conversionIndex],
      targetMimetype: selectedConversion,
    };

    setConversionData(newConversionData);
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

  const handleConversionRequest = async (conversion, conversionIndex) => {
    try {
      const response = await apiService.convertFile(
        conversion.file,
        conversion.targetMimetype
      );

      const { file_name } = response.converted_file;
      const url = await getFileDownloadUrl(file_name);

      return {
        fileDownloadUrl: url,
        convertedFileName: file_name,
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

    const conversions = [...conversionData];

    try {
      await Promise.all(
        conversions.map(async (conversion, index) => {
          if (conversion.fileDownloadUrl) {
            return;
          }

          conversion = {
            ...conversion,
            status: "processing",
          };

          // Use the functional state update form
          setConversionData((prevConversions) => {
            const updatedConversions = [...prevConversions];
            updatedConversions[index] = conversion;
            return updatedConversions;
          });

          const { fileDownloadUrl, convertedFileName } =
            await handleConversionRequest(conversion, index);

          const updatedConversion = {
            ...conversion,
            fileDownloadUrl: fileDownloadUrl,
            convertedFileName: convertedFileName,
            status: fileDownloadUrl ? "completed" : "failed",
          };

          // Use the functional state update form
          setConversionData((prevConversions) => {
            const updatedConversions = [...prevConversions];
            updatedConversions[index] = updatedConversion;
            return updatedConversions;
          });
        })
      );
    } catch (error) {
      console.error("Error in one or more requests:", error);
    }
  };

  const handleCancelConversion = (index) => {
    const newConversionData = [...conversionData];
    newConversionData.splice(index, 1);
    setConversionData(newConversionData);
  };

  const supportedConversionsOfUploadedFile = (fileObject) => {
    const conversions = supportedConversions;
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

        {conversionData.length > 0 && (
          <div className="block block-rounded block-bordered">
            <div className="block-header block-header-default">
              <h3 className="block-title">{fileType} Conversions</h3>
              <div className="block-options">
                <div className="block-options-item">
                  {/* <code>.table</code> */}
                </div>
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
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {conversionData.map((fileObject, index) => (
                    <tr key={index}>
                      <td className="text-center" scope="row">
                        {index + 1}
                      </td>
                      <td className="font-w600">
                        <i className="fa fa-image mr-2"></i>
                        {fileObject.file.name}
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
                        <div className="btn-group">
                          <button
                            type="reset"
                            className="btn btn-sm btn-danger mr-1"
                            onClick={() => handleCancelConversion(index)}
                          >
                            <i className="fa fa-fw fa-times"></i> Delete
                          </button>
                          {fileObject.fileDownloadUrl && (
                            <a
                              href={
                                fileObject.fileDownloadUrl
                                  ? fileObject.fileDownloadUrl
                                  : "#"
                              }
                              className="btn btn-sm btn-success"
                              target="_blank"
                              download={
                                fileObject.convertedFileName
                                  ? fileObject.convertedFileName
                                  : ""
                              }
                            >
                              <i className="fa fa-fw fa-download"></i> Download
                            </a>
                          )}
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
                  onClick={() => setConversionData([])}
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
        )}

        {conversionData.length === 0 && (
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
        )}
      </div>
      <Features />
    </>
  );
}

export default FileConversion;
