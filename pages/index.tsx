import Link from 'next/link';
import Image from 'next/image';
import Head from 'next/head';

export default function Home() {
  return (
    <>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>
      <div className="flex h-screen w-screen bg-gradient-to-r from-white to-blue-50">
        {/* Left Side */}
        <div className="w-1/2 flex flex-col justify-center items-center px-12">
          {/* Logo */}
          <div className="mb-8 transform hover:scale-110 transition-transform duration-300">
            <Image
              src="/icon.svg"
              alt="Medisynq Logo"
              width={100}
              height={100}
              className="drop-shadow-lg"
            />
          </div>
          
          {/* Title and Description */}
          <div className="text-center mb-12">
            <h1 className="text-6xl font-extrabold text-gray-800 mb-4 font-display">
              Medisynq
            </h1>
            <p className="text-xl text-gray-600 font-light">
              Your Health, Our Priority
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-6 w-full max-w-sm">
            <Link
              href="/login"
              className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl 
                       hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-300 
                       shadow-lg hover:shadow-xl text-center font-display"
            >
              Login
            </Link>
            
            <Link
              href="/signup"
              className="w-full px-8 py-4 bg-white text-indigo-600 font-semibold rounded-xl 
                       hover:bg-indigo-50 transform hover:scale-105 transition-all duration-300 
                       border-2 border-indigo-600 shadow-lg hover:shadow-xl text-center font-display"
            >
              Sign Up
            </Link>
          </div>

          {/* Additional Info */}
          <div className="mt-12 text-center text-gray-500 text-sm">
            <p className="font-medium">24/7 Medical Support</p>
            <p className="mt-2">Trusted by thousands of patients</p>
          </div>
        </div>

        {/* Right Side */}
        <div className="w-1/2 h-full overflow-hidden">
          <img 
            src="/cover_img2.jpg" 
            alt="Doctors" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </>
  );
}
