import React from "react";

import { WrapperContext } from "../wrapper-provider/wrapper-provider.jsx";

const WrapperConsumer = () => {
    const { getValue } = React.useContext(WrapperContext);

    return <>{getValue('consumer')}</>;
};

export default WrapperConsumer;
