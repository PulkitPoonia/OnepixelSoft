import React from 'react'
import { Form, Dropdown, InputGroup } from 'react-bootstrap'
import { Search } from 'react-feather'

const SerarchForm = () => {
    return (
        <Dropdown className="navbar-search">
            <Dropdown.Toggle variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover d-xl-none">
                <span className="icon">
                    <span className="feather-icon"><Search /></span>
                </span>
            </Dropdown.Toggle>
            <div className="d-xl-flex d-none">
                <InputGroup>
                    <span className="input-affix-wrapper input-search affix-border">
                        <Form.Control type="text" className="bg-transparent" data-navbar-search-close="false" placeholder="Search..." aria-label="Search" />
                        <span className="input-suffix"><span>/</span>
                            <span className="btn-input-clear">
                                <i className="bi bi-x-circle-fill" />
                            </span>
                            <span className="spinner-border spinner-border-sm input-loader text-primary" role="status">
                                <span className="sr-only">Loading...</span>
                            </span>
                        </span>
                    </span>
                </InputGroup>
            </div>
            <Dropdown.Menu className="p-0">
                {/* Mobile Search */}
                <Dropdown.Item className="d-xl-none bg-transparent">
                    <InputGroup className="mobile-search">
                        <span className="input-affix-wrapper input-search">
                            <Form.Control type="text" placeholder="Search..." aria-label="Search" />
                            <span className="input-suffix">
                                <span className="btn-input-clear">
                                    <i className="bi bi-x-circle-fill" />
                                </span>
                                <span className="spinner-border spinner-border-sm input-loader text-primary" role="status">
                                    <span className="sr-only">Loading...</span>
                                </span>
                            </span>
                        </span>
                    </InputGroup>
                </Dropdown.Item>
                {/*/ Mobile Search */}
                <div data-simplebar className="dropdown-body p-2">
                    <h6 className="dropdown-header">Recent Search
                    </h6>
                    <div className="dropdown-item bg-transparent">
                        <a href="#some" className="badge badge-pill badge-soft-secondary">Grunt</a>
                        <a href="#some" className="badge badge-pill badge-soft-secondary">Node JS</a>
                        <a href="#some" className="badge badge-pill badge-soft-secondary">SCSS</a>
                    </div>
                    <div className="dropdown-divider" />
                    <h6 className="dropdown-header">Help
                    </h6>
                    <a href="#some" className="dropdown-item">
                        <div className="media align-items-center">
                            <div className="media-head me-2">
                                <div className="avatar avatar-icon avatar-xs avatar-soft-light avatar-rounded">
                                    <span className="initial-wrap">
                                        <span className="svg-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-tabler icon-tabler-corner-down-right" width={24} height={24} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                                <path d="M6 6v6a3 3 0 0 0 3 3h10l-4 -4m0 8l4 -4" />
                                            </svg>
                                        </span>
                                    </span>
                                </div>
                            </div>
                            <div className="media-body">
                                How to setup theme?
                            </div>
                        </div>
                    </a>
                    <a href="#some" className="dropdown-item">
                        <div className="media align-items-center">
                            <div className="media-head me-2">
                                <div className="avatar avatar-icon avatar-xs avatar-soft-light avatar-rounded">
                                    <span className="initial-wrap">
                                        <span className="svg-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-tabler icon-tabler-corner-down-right" width={24} height={24} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                                <path d="M6 6v6a3 3 0 0 0 3 3h10l-4 -4m0 8l4 -4" />
                                            </svg>
                                        </span>
                                    </span>
                                </div>
                            </div>
                            <div className="media-body">
                                View detail documentation
                            </div>
                        </div>
                    </a>
                    <div className="dropdown-divider" />
                    <h6 className="dropdown-header">Users
                    </h6>
                    <a href="#some" className="dropdown-item">
                        <div className="media align-items-center">
                            <div className="media-head me-2">
                                <div className="avatar avatar-xs avatar-soft-primary avatar-rounded">
                                    <span className="initial-wrap">S</span>
                                </div>
                            </div>
                            <div className="media-body">
                                Sarah Jone
                            </div>
                        </div>
                    </a>
                    <a href="#some" className="dropdown-item">
                        <div className="media align-items-center">
                            <div className="media-head me-2">
                                <div className="avatar avatar-xs avatar-soft-primary avatar-rounded">
                                    <span className="initial-wrap">J</span>
                                </div>
                            </div>
                            <div className="media-body">
                                Joe Jackson
                            </div>
                        </div>
                    </a>
                    <a href="#some" className="dropdown-item">
                        <div className="media align-items-center">
                            <div className="media-head me-2">
                                <div className="avatar avatar-xs avatar-soft-success avatar-rounded">
                                    <span className="initial-wrap">M</span>
                                </div>
                            </div>
                            <div className="media-body">
                                Maria Richard
                            </div>
                        </div>
                    </a>
                </div>
                <div className="dropdown-footer d-xl-flex d-none"><a href="#some"><u>Search all</u></a></div>
            </Dropdown.Menu>
        </Dropdown>
    )
}

export default SerarchForm
