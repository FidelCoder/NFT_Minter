import React, { useState } from "react";
import PropTypes from "prop-types";
import { Button, Modal, Form, FloatingLabel } from "react-bootstrap";
import { uploadToIpfs } from "../../utils/minter";


const AddNfts = ({ save, address }) => {
  // create state for all the NFT properties coming from the form
  const [description, setDescription] = useState("");
  const [exteralUrl, setExteralUrl] = useState("");
  const [ipfsImage, setIpfsImage] = useState("");
  const [name, setName] = useState("");
  const [show, setShow] = useState(false);

      // check if all form data has been filled
  const isFormFilled = () =>
  name && ipfsImage && description;

  // close the popup modal
  const handleClose = () => {
    setShow(false);
  };

  // display the popup modal
  const handleShow = () => setShow(true);

  return (
    <>
      <Button
        onClick={handleShow}
        variant="dark"
        className="rounded-pill px-0"
        style={{ width: "38px" }}
      >
        <i className="bi bi-plus"></i>
      </Button>

      {/* Modal */}
      <Modal show={show} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Create NFT</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form>
            <FloatingLabel
              controlId="inputLocation"
              label="Name"
              className="mb-3"
            >
              <Form.Control
                type="text"
                placeholder="Name of NFT"
                onChange={(e) => {
                  setName(e.target.value);
                }}
              />
            </FloatingLabel>

            <FloatingLabel
              controlId="inputDescription"
              label="Description"
              className="mb-3"
            >
              <Form.Control
                as="textarea"
                placeholder="description"
                style={{ height: "80px" }}
                onChange={(e) => {
                  setDescription(e.target.value);
                }}
              />
            </FloatingLabel>

            <FloatingLabel
              controlId="InputExternalUrl"
              label="ExternalUrl"
              className="mb-3"
            >
              <Form.Control
                as="textarea"
                placeholder="external url to your NFT (optional)"
                style={{ height: "80px" }}
                onChange={(e) => {
                  setExteralUrl(e.target.value);
                }}
              />
            </FloatingLabel>

            <Form.Control
              type="file"
              className={"mb-3"}
              onChange={async (e) => {
                const imageUrl = await uploadToIpfs(e);
                if (!imageUrl) {
                  alert("failed to upload image");
                  return;
                }
                setIpfsImage(imageUrl);
              }}
              placeholder="Product name"
            ></Form.Control>
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="outline-secondary" onClick={handleClose}>
            Close
          </Button>
          <Button
            variant="dark"
            disabled={!isFormFilled()}
            onClick={() => {
              save({
                name,
                ipfsImage,
                description,
                exteralUrl,
                ownerAddress: address
              });
              handleClose();
            }}
          >
            Create NFT
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};


AddNfts.propTypes = {
    save: PropTypes.func.isRequired,
    address: PropTypes.string.isRequired,
};
  
export default AddNfts;
