import React from 'react';
import PropTypes from 'prop-types';

const ReferenceFull = (props) => {
    return <div>{props.reference}</div>;
};

ReferenceFull.propTypes = {
    reference: PropTypes.string,
};

export default ReferenceFull;
