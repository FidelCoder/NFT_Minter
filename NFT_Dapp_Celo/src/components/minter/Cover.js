import React from "react";
import { Button } from "react-bootstrap";
import PropTypes from "prop-types";

const Cover = ({ name, connect }) => {
  if (name) {
    return (
      <div
        className="d-flex justify-content-center flex-column text-center"
        style={{ background: "#000", minHeight: "85vh", minWidth: "100vw" }}
      >
        <div className="text-light mb-5 text-center">
          <h1>{name}</h1>
          <p>Please connect your wallet to continue.</p>
          <Button
            onClick={() => connect().catch((e) => console.log(e))}
            variant="outline-light"
            className="rounded-pill px-3 mt-3"
          >
            Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

Cover.propTypes = {
  name: PropTypes.string,
};

Cover.defaultProps = {
  name: "",
};

export default Cover;

