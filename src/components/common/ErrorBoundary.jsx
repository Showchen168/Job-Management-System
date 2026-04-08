import React from 'react';
import { AlertCircle } from 'lucide-react';
import logger from '../../utils/logger';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        logger.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-50 p-8">
                    <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
                        <div className="p-4 bg-red-100 rounded-full inline-block mb-4">
                            <AlertCircle className="text-red-600" size={48} />
                        </div>
                        <h2 className="text-xl font-bold text-red-700 mb-2">系統發生錯誤</h2>
                        <p className="text-slate-600 mb-4">
                            {this.state.error?.message || '未知錯誤'}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                            重新載入
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
