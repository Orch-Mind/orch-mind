import React from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import Features from './components/Features'
import Download from './components/Download'


import Footer from './components/Footer'
import NeuralBackground from './components/NeuralBackground'

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-x-hidden">
      <NeuralBackground/>
      <Header />
      <main>
        <Hero />
        <Features />
        <Download />


      </main>
      <Footer />
    </div>
  )
}

export default App
