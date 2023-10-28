import React from "react";
import PropTypes from "prop-types";

const TreeLeaf = (props) => {
    return <>Tree leaf {props._self.name}</>;
};

TreeLeaf.propTypes = {
    _self: PropTypes.shape({
        name: PropTypes.string,
    }),
};

export default TreeLeaf;
