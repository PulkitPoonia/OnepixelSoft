import React, { useState } from 'react'
import { Form, InputGroup } from 'react-bootstrap'

const CustomInput = () => {

    const [inputValue, setinputValue] = useState("");
    return (
        <InputGroup className="d-xl-flex d-none">
            <span className="input-affix-wrapper input-search affix-border">
                <Form.Control type="text" className="bg-transparent" data-navbar-search-close="false" placeholder="Search..." aria-label="Search" value={inputValue} onChange={e => setinputValue(e.target.value)} />
                <span className="input-suffix" onClick={() => setinputValue("")}>
                    <span>/</span>
                    <span className="btn-input-clear"  >
                        <i className="bi bi-x-circle-fill" />
                    </span>
                    <span className="spinner-border spinner-border-sm input-loader text-primary" role="status">
                        <span className="sr-only">Loading...</span>
                    </span>
                </span>
            </span>
        </InputGroup>
    )
}

export default CustomInput
