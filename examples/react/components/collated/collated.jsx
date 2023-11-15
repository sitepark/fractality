import React from 'react';
import PropTypes from 'prop-types';

const Collated = (props) => {
    return <div>{`Collated component ${props._self.name}`}</div>;
};

Collated.propTypes = {
    _self: PropTypes.shape({
        name: PropTypes.string,
    }),
};

export default Collated;
